import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { writeAuditLog } from "../../lib/audit.js";
import { getEnv } from "../../config/env.js";
import { AppError } from "../../shared/errors/app-error.js";
import { getAdapter } from "./lookup.registry.js";
import { issueToken, consumeToken, getToken, purgeExpired } from "./lookup.token-store.js";
import {
  lookupSourceSchema,
  lookupQueryBySource,
  commitSelectedFieldsSchema,
  type LookupSource,
} from "./lookup.types.js";

const DISCLAIMER =
  "You are authorizing a one-time fetch from an external government source. Data must be reviewed before committing to the case.";

const __dir = dirname(fileURLToPath(import.meta.url));

function loadFixture(source: LookupSource): { results: Record<string, unknown>[] } {
  const path = join(__dir, "fixtures", `${source}.json`);
  const raw = JSON.parse(readFileSync(path, "utf-8")) as { results: Record<string, unknown>[] };
  return raw;
}

export function previewLookup(
  source: string,
  query: Record<string, unknown>,
  caseId: string,
  userId: string
) {
  purgeExpired();
  const src = lookupSourceSchema.parse(source);
  lookupQueryBySource[src].parse(query);

  const adapter = getAdapter(src);
  const meta = adapter.preview(query);
  const confirmationToken = issueToken({
    source: src,
    url: meta.url,
    query,
    caseId,
    userId,
  });

  return {
    confirmationToken,
    source: src,
    url: meta.url,
    description: meta.description,
    summary: meta.summary,
    query,
    fieldSchema: meta.fieldSchema,
    disclaimer: DISCLAIMER,
    expiresIn: 300,
  };
}

export async function executeLookup(
  token: string,
  userId: string,
  pastedData?: unknown
) {
  purgeExpired();
  const pending = getToken(token);
  if (!pending) throw AppError.badRequest("Invalid or expired confirmation token");
  if (pending.userId !== userId) throw AppError.forbidden("Token does not belong to this user");

  const adapter = getAdapter(pending.source);
  const env = getEnv();
  let fetchMode: "live" | "paste" | "fixture" = "live";
  let data: { results: Record<string, unknown>[]; rawNote?: string };

  if (pastedData !== undefined) {
    data = adapter.normalizePasted(pastedData);
    fetchMode = "paste";
  } else if (!env.LOOKUP_LIVE_FETCH) {
    data = loadFixture(pending.source);
    fetchMode = "fixture";
  } else {
    data = await adapter.fetchLive(pending.query);
    const needsPaste =
      pending.source === "mca21" ||
      data.rawNote === "fetch_failed" ||
      data.rawNote === "mca_captcha_likely" ||
      data.rawNote === "parse_empty" ||
      (data.results.length === 1 &&
        (data.results[0]?.status === "requires_manual_paste" ||
          data.results[0]?.status === "lookup_requires_paste"));

    if (needsPaste) {
      return {
        logId: null as string | null,
        data,
        reviewRequired: true,
        fetchMode: "paste" as const,
        pasteRequired: true,
        confirmationToken: token,
        message: "Live fetch incomplete. Re-submit execute with pastedData JSON array.",
      };
    }
    fetchMode = "live";
  }

  consumeToken(token);

  const log = await prisma.lookupLog.create({
    data: {
      userId,
      caseId: pending.caseId,
      source: pending.source,
      url: pending.url,
      query: pending.query as Prisma.InputJsonValue,
      dataRetrieved: data as Prisma.InputJsonValue,
      decision: "pending_review",
      fetchMode,
    },
  });

  await writeAuditLog({
    eventType: "lookup_execute",
    userId,
    caseId: pending.caseId,
    description: `Lookup executed: ${pending.source} (${fetchMode})`,
    inputData: pending.query as Prisma.InputJsonValue,
    result: "success",
  });

  return {
    logId: log.id,
    data,
    reviewRequired: true,
    fetchMode,
    pasteRequired: false,
  };
}

export async function commitLookup(
  logId: string,
  selectedFields: unknown,
  userId: string
) {
  const fields = commitSelectedFieldsSchema.parse(selectedFields);
  const log = await prisma.lookupLog.findUnique({ where: { id: logId } });
  if (!log) throw AppError.notFound("Lookup log not found");
  if (log.userId !== userId) throw AppError.forbidden("Not your lookup log");
  if (!log.caseId) throw AppError.badRequest("Lookup not linked to a case");
  if (log.decision === "accepted") throw AppError.badRequest("Already committed");

  const caseRecord = await prisma.rtiCase.findUnique({ where: { id: log.caseId } });
  if (!caseRecord) throw AppError.notFound("Case not found");

  await prisma.$transaction(async (tx) => {
    const doc = await tx.document.create({
      data: {
        caseId: log.caseId!,
        docType: "evidence",
        textContent: `External lookup: ${log.source} at ${log.createdAt.toISOString()}`,
        metadata: { lookupLogId: logId, source: log.source, query: log.query },
        uploadedById: userId,
        isVerified: true,
        language: "en",
      },
    });

    const stored = log.dataRetrieved as { results?: Record<string, unknown>[] } | null;
    const allResults = stored?.results ?? [];
    const indices = fields.resultIndices ?? allResults.map((_, i) => i);

    for (const idx of indices) {
      const row = allResults[idx];
      if (!row) continue;
      await tx.fact.create({
        data: {
          caseId: log.caseId!,
          documentId: doc.id,
          factType: "official_statement",
          content: JSON.stringify(row),
          confidence: "confirmed",
          enteredById: userId,
        },
      });
    }

    for (const f of fields.facts ?? []) {
      await tx.fact.create({
        data: {
          caseId: log.caseId!,
          documentId: doc.id,
          factType: f.factType,
          content: f.content,
          amount: f.amount != null ? f.amount : undefined,
          amountCategory: f.amountCategory,
          factDate: f.factDate ? new Date(f.factDate) : undefined,
          legalSection: f.legalSection,
          confidence: "confirmed",
          enteredById: userId,
        },
      });
    }

    for (const ent of fields.entities ?? []) {
      let entity = await tx.entity.findFirst({ where: { name: ent.name } });
      if (!entity) {
        entity = await tx.entity.create({ data: { name: ent.name, type: ent.type } });
      }
      await tx.caseEntity.upsert({
        where: {
          caseId_entityId_role: {
            caseId: log.caseId!,
            entityId: entity.id,
            role: ent.role,
          },
        },
        create: { caseId: log.caseId!, entityId: entity.id, role: ent.role },
        update: {},
      });
    }

    const meta = (caseRecord.metadata as Record<string, unknown>) ?? {};
    const lookups = (meta.lookups as unknown[]) ?? [];
    lookups.push({
      logId,
      source: log.source,
      committedAt: new Date().toISOString(),
      ...(fields.caseMetadata ?? {}),
    });

    await tx.rtiCase.update({
      where: { id: log.caseId! },
      data: {
        metadata: { ...meta, lookups } as Prisma.InputJsonValue,
      },
    });

    await tx.lookupLog.update({
      where: { id: logId },
      data: {
        decision: "accepted",
        dataRetrieved: fields as Prisma.InputJsonValue,
      },
    });
  });

  await writeAuditLog({
    eventType: "lookup_commit",
    userId,
    caseId: log.caseId,
    description: "Lookup data committed after review",
    inputData: fields as Prisma.InputJsonValue,
    result: "success",
  });

  return { committed: true, caseId: log.caseId };
}

export async function listLookupLogs(caseId: string, userId: string) {
  return prisma.lookupLog.findMany({
    where: { caseId, userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function rejectLookup(logId: string, userId: string) {
  const log = await prisma.lookupLog.findUnique({ where: { id: logId } });
  if (!log || log.userId !== userId) throw AppError.notFound();
  await prisma.lookupLog.update({
    where: { id: logId },
    data: { decision: "rejected" },
  });
  return { rejected: true };
}
