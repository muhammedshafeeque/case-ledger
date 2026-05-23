import { prisma } from "../../lib/prisma.js";
import { assertCaseAccessForUser } from "../forensic/case-access.js";
import { assertCasePermission } from "../forensic/case-permissions.js";
import { parseCdrCsv } from "./cdr.parser.js";
import { runRulePipeline } from "../intelligence/rules/rule-engine.js";

async function ensureEntity(name: string) {
  let e = await prisma.entity.findFirst({ where: { name } });
  if (!e) e = await prisma.entity.create({ data: { name, type: "person" } });
  return e;
}

export async function importCdr(
  caseId: string,
  userId: string,
  role: string,
  csvText: string,
  documentId?: string
) {
  await assertCasePermission(caseId, userId, role, "add_evidence");
  await assertCaseAccessForUser(caseId, userId, role);

  const rows = parseCdrCsv(csvText);
  let factCount = 0;
  let edgeCount = 0;

  let docId = documentId;
  if (!docId) {
    const stub = await prisma.document.create({
      data: {
        caseId,
        docType: "evidence",
        processingStatus: "skipped",
        uploadedById: userId,
        textContent: `CDR import ${new Date().toISOString()}`,
      },
    });
    docId = stub.id;
  }

  for (const row of rows.slice(0, 5000)) {
    const caller = await ensureEntity(row.caller);
    const callee = await ensureEntity(row.callee);

    await prisma.caseEntity.upsert({
      where: { caseId_entityId_role: { caseId, entityId: caller.id, role: "other" } },
      create: { caseId, entityId: caller.id, role: "other" },
      update: {},
    });
    await prisma.caseEntity.upsert({
      where: { caseId_entityId_role: { caseId, entityId: callee.id, role: "other" } },
      create: { caseId, entityId: callee.id, role: "other" },
      update: {},
    });

    const existing = await prisma.entityRelationship.findFirst({
      where: {
        fromEntityId: caller.id,
        toEntityId: callee.id,
        relationshipType: "called",
        caseId,
      },
    });
    if (!existing) {
      await prisma.entityRelationship.create({
        data: {
          fromEntityId: caller.id,
          toEntityId: callee.id,
          relationshipType: "called",
          caseId,
          notes: row.occurredAt.toISOString(),
        },
      });
      edgeCount++;
    }

    await prisma.fact.create({
      data: {
        caseId,
        documentId: docId,
        factType: "process_event",
        content: `Call ${row.caller} → ${row.callee}${row.durationSec ? ` (${row.durationSec}s)` : ""}`,
        factDate: row.occurredAt,
        entityRefId: caller.id,
        enteredById: userId,
      },
    });
    factCount++;
  }

  await runRulePipeline(caseId, docId);
  return { rowsParsed: rows.length, factsCreated: factCount, relationshipsCreated: edgeCount };
}
