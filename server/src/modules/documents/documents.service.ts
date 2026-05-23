import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { buildS3Key, uploadToS3, getSignedDownloadUrl, sha256, isS3Configured, downloadFromS3 } from "../../lib/s3.js";
import { runRulePipeline } from "../intelligence/rules/rule-engine.js";
import { recordCustodyEvent } from "../forensic/custody.service.js";
import { createExtractJob, createMetadataJob } from "../forensic/forensic-jobs.service.js";
import { assignExhibitForDocument, inferMediaKind } from "../../lib/bates.js";
import { writeAuditLog } from "../../lib/audit.js";
import type { CommitDocumentInput } from "./schemas/document.schema.js";

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  rtiId: string,
  docType: string
) {
  const key = buildS3Key(rtiId, docType, filename);
  if (!isS3Configured()) {
    const hash = sha256(buffer);
    return { key, hash, size: buffer.length, localOnly: true };
  }
  return uploadToS3(key, buffer, mimeType);
}

export async function commitDocument(input: CommitDocumentInput, userId: string) {
  const caseRecord = await prisma.rtiCase.findUnique({ where: { id: input.caseId } });
  if (!caseRecord) throw AppError.notFound("Case not found");

  const hasFile = Boolean(input.s3Key);
  const hasText = Boolean(input.textContent?.trim());
  const processingStatus = hasFile && !hasText ? "pending" : hasText ? "done" : "skipped";
  const mediaKind = inferMediaKind(input.mimeType, input.originalFilename);

  const doc = await prisma.$transaction(async (tx) => {
    const created = await tx.document.create({
      data: {
        caseId: input.caseId,
        docType: input.docType,
        s3Key: input.s3Key,
        sha256Hash: input.sha256Hash,
        fileSize: input.fileSize ? BigInt(input.fileSize) : null,
        mimeType: input.mimeType,
        originalFilename: input.originalFilename,
        mediaKind,
        processingStatus,
        extractedAt: hasText ? new Date() : undefined,
        uploadedById: userId,
        textContent: input.textContent,
        notAnswered: input.notAnswered,
        language: input.language,
        isVerified: true,
      },
    });

    await tx.chainOfCustodyEvent.create({
      data: {
        documentId: created.id,
        caseId: input.caseId,
        eventType: "received",
        actorId: userId,
        payload: { docType: input.docType },
      },
    });
    if (input.sha256Hash) {
      await tx.chainOfCustodyEvent.create({
        data: {
          documentId: created.id,
          caseId: input.caseId,
          eventType: "hashed",
          actorId: userId,
          payload: { sha256: input.sha256Hash },
        },
      });
    }
    if (input.s3Key) {
      await tx.chainOfCustodyEvent.create({
        data: {
          documentId: created.id,
          caseId: input.caseId,
          eventType: "stored",
          actorId: userId,
          payload: { s3Key: input.s3Key },
        },
      });
    }

    for (const mention of input.entityMentions ?? []) {
      let entity = await tx.entity.findFirst({ where: { name: mention.name } });
      if (!entity) {
        entity = await tx.entity.create({
          data: { name: mention.name, type: mention.type },
        });
      }
      await tx.caseEntity.upsert({
        where: { caseId_entityId_role: { caseId: input.caseId, entityId: entity.id, role: mention.role } },
        create: { caseId: input.caseId, entityId: entity.id, role: mention.role },
        update: {},
      });
      await tx.documentEntity.create({
        data: { documentId: created.id, entityId: entity.id, mentionContext: mention.role },
      });
    }

    for (const f of input.facts ?? []) {
      let entityRefId: string | undefined;
      if (f.entityName) {
        const ent = await tx.entity.findFirst({ where: { name: f.entityName } });
        entityRefId = ent?.id;
      }
      await tx.fact.create({
        data: {
          documentId: created.id,
          caseId: input.caseId,
          factType: f.factType,
          content: f.content,
          amount: f.amount,
          amountCategory: f.amountCategory,
          factDate: f.factDate ? new Date(f.factDate) : null,
          entityRefId,
          legalSection: f.legalSection,
          enteredById: userId,
        },
      });
    }

    return created;
  });

  if (hasText) {
    await prisma.documentExtraction.create({
      data: {
        documentId: doc.id,
        status: "done",
        source: "paste",
        extractedText: input.textContent,
        completedAt: new Date(),
      },
    });
    await recordCustodyEvent({
      documentId: doc.id,
      caseId: input.caseId,
      eventType: "extracted",
      actorId: userId,
      payload: { source: "paste" },
    });
  }

  if (hasFile && !hasText) {
    try {
      await createExtractJob(doc.id, input.caseId);
    } catch {
      /* Redis unavailable — sync extract can be retried via jobs UI */
    }
  }
  if (hasFile && ["image", "audio", "video", "document"].includes(mediaKind)) {
    try {
      await createMetadataJob(doc.id, input.caseId);
    } catch {
      /* metadata optional */
    }
  }

  const exhibitNumber = await assignExhibitForDocument(input.caseId, doc.id, caseRecord.rtiId);
  await writeAuditLog({
    eventType: "document.exhibit_assigned",
    userId,
    caseId: input.caseId,
    description: `Exhibit ${exhibitNumber} assigned`,
    result: "success",
    inputData: { documentId: doc.id, exhibitNumber },
  });

  await runRulePipeline(input.caseId, doc.id);
  return prisma.document.findUniqueOrThrow({ where: { id: doc.id } });
}

export async function getDocument(id: string) {
  const doc = await prisma.document.findUnique({ where: { id }, include: { facts: true } });
  if (!doc) throw AppError.notFound();
  return doc;
}

export async function listByCase(caseId: string) {
  return prisma.document.findMany({ where: { caseId }, orderBy: { uploadedAt: "desc" } });
}

export async function downloadUrl(id: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc?.s3Key) throw AppError.notFound("No file attached");
  const url = await getSignedDownloadUrl(doc.s3Key);
  return { url, expiresIn: 3600 };
}

export async function verifyHash(id: string, userId?: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc?.sha256Hash) throw AppError.badRequest("No hash stored");

  let computed: string | null = null;
  if (doc.s3Key && isS3Configured()) {
    const buffer = await downloadFromS3(doc.s3Key);
    computed = sha256(buffer);
  } else if (doc.textContent) {
    computed = sha256(Buffer.from(doc.textContent, "utf8"));
  }

  const valid = computed !== null && computed === doc.sha256Hash;
  if (userId) {
    await recordCustodyEvent({
      documentId: id,
      caseId: doc.caseId,
      eventType: "verified",
      actorId: userId,
      payload: { valid, computed },
    });
  }
  return { stored: doc.sha256Hash, computed, valid };
}
