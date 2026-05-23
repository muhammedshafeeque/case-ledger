import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { downloadFromS3, getSignedDownloadUrl, isS3Configured, sha256 } from "../../lib/s3.js";
import { writeAuditLog } from "../../lib/audit.js";
import { getCaseScore } from "../cases/cases.service.js";
import { graphRepository } from "../entities/repositories/graph.repository.js";
import { recordCustodyEvent } from "./custody.service.js";
import { assertCaseAccessForUser } from "./case-access.js";
import { PassThrough } from "stream";

type ZipArchiver = {
  append(source: Buffer | string, opts?: { name?: string }): void;
  pipe<T>(dest: PassThrough): T;
  finalize(): void;
  on(event: "error", listener: (err: Error) => void): void;
};
import { generateEvidencePackageHtml } from "../legal/legal.service.js";
import { parseExportProfile, type ExportProfile } from "../../lib/export-profile.js";
import { htmlToPdfBuffer } from "../../lib/pdf-report.js";
import { assertCasePermission } from "./case-permissions.js";

export async function listEvidence(caseId: string, userId: string, role: string) {
  await assertCaseAccessForUser(caseId, userId, role);
  const docs = await prisma.document.findMany({
    where: { caseId },
    orderBy: { uploadedAt: "desc" },
    include: {
      extractions: { orderBy: { createdAt: "desc" }, take: 1 },
      custodyEvents: { orderBy: { occurredAt: "desc" }, take: 3 },
      _count: { select: { custodyEvents: true, annotations: true } },
    },
  });
  return docs.map((d) => ({
    id: d.id,
    docType: d.docType,
    originalFilename: d.originalFilename,
    sha256Hash: d.sha256Hash,
    fileSize: d.fileSize?.toString(),
    mimeType: d.mimeType,
    processingStatus: d.processingStatus,
    extractedAt: d.extractedAt,
    uploadedAt: d.uploadedAt,
    isVerified: d.isVerified,
    latestExtraction: d.extractions[0] ?? null,
    custodyEventCount: d._count.custodyEvents,
    annotationCount: d._count.annotations,
    recentCustody: d.custodyEvents,
  }));
}

export async function getCustodyChain(documentId: string, userId: string, role: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw AppError.notFound();
  await assertCaseAccessForUser(doc.caseId, userId, role);
  return prisma.chainOfCustodyEvent.findMany({
    where: { documentId },
    orderBy: { occurredAt: "asc" },
    include: { actor: { select: { id: true, name: true, email: true } } },
  });
}

export async function verifyDocumentHash(documentId: string, userId: string, role: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw AppError.notFound();
  await assertCaseAccessForUser(doc.caseId, userId, role);
  if (!doc.sha256Hash) throw AppError.badRequest("No hash stored");

  let computed: string | null = null;
  if (doc.s3Key && isS3Configured()) {
    const buffer = await downloadFromS3(doc.s3Key);
    computed = sha256(buffer);
  } else if (doc.textContent) {
    computed = sha256(Buffer.from(doc.textContent, "utf8"));
  }

  const valid = computed !== null && computed === doc.sha256Hash;
  await recordCustodyEvent({
    documentId,
    caseId: doc.caseId,
    eventType: "verified",
    actorId: userId,
    payload: { valid, computed, stored: doc.sha256Hash },
  });
  await writeAuditLog({
    eventType: "forensic.verify_hash",
    userId,
    caseId: doc.caseId,
    description: `Hash verification ${valid ? "passed" : "failed"} for document ${documentId}`,
    result: valid ? "success" : "failure",
    inputData: { documentId },
  });

  return { stored: doc.sha256Hash, computed, valid };
}

export async function recordDocumentView(documentId: string, userId: string, role: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw AppError.notFound();
  await assertCaseAccessForUser(doc.caseId, userId, role);
  await recordCustodyEvent({
    documentId,
    caseId: doc.caseId,
    eventType: "viewed",
    actorId: userId,
  });
}

export async function getDocumentContent(documentId: string, userId: string, role: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { extractions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!doc) throw AppError.notFound();
  await assertCaseAccessForUser(doc.caseId, userId, role);
  await recordDocumentView(documentId, userId, role);

  let downloadUrl: string | null = null;
  if (doc.s3Key && isS3Configured()) {
    downloadUrl = await getSignedDownloadUrl(doc.s3Key);
  }

  const extractedText =
    doc.extractions[0]?.extractedText ?? doc.textContent ?? "";

  return {
    document: {
      id: doc.id,
      caseId: doc.caseId,
      docType: doc.docType,
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      processingStatus: doc.processingStatus,
      textContent: doc.textContent,
    },
    extractedText,
    downloadUrl,
    extraction: doc.extractions[0] ?? null,
  };
}

export async function listAnnotations(documentId: string, userId: string, role: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw AppError.notFound();
  await assertCaseAccessForUser(doc.caseId, userId, role);
  return prisma.documentAnnotation.findMany({
    where: { documentId },
    orderBy: { createdAt: "asc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

export async function createAnnotation(
  documentId: string,
  userId: string,
  role: string,
  data: {
    page?: number;
    startOffset?: number;
    endOffset?: number;
    quote: string;
    label: "redaction" | "key_quote" | "not_answered" | "comment";
  }
) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw AppError.notFound();
  await assertCaseAccessForUser(doc.caseId, userId, role);
  return prisma.documentAnnotation.create({
    data: {
      documentId,
      page: data.page,
      startOffset: data.startOffset,
      endOffset: data.endOffset,
      quote: data.quote,
      label: data.label,
      createdById: userId,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

export async function deleteAnnotation(annotationId: string, userId: string, role: string) {
  const ann = await prisma.documentAnnotation.findUnique({
    where: { id: annotationId },
    include: { document: true },
  });
  if (!ann) throw AppError.notFound();
  await assertCaseAccessForUser(ann.document.caseId, userId, role);
  if (role !== "admin" && ann.createdById !== userId) {
    throw AppError.forbidden("Cannot delete another user's annotation");
  }
  await prisma.documentAnnotation.delete({ where: { id: annotationId } });
}

export async function getTimeline(caseId: string, userId: string, role: string) {
  await assertCaseAccessForUser(caseId, userId, role);

  const [facts, documents, alerts, custody, notes, contradictions, diary] = await Promise.all([
    prisma.fact.findMany({ where: { caseId }, select: { id: true, content: true, factType: true, factDate: true, enteredAt: true } }),
    prisma.document.findMany({ where: { caseId }, select: { id: true, docType: true, uploadedAt: true, originalFilename: true } }),
    prisma.alert.findMany({ where: { caseId }, select: { id: true, title: true, description: true, severity: true, createdAt: true } }),
    prisma.chainOfCustodyEvent.findMany({
      where: { caseId },
      select: { id: true, eventType: true, documentId: true, occurredAt: true, payload: true },
    }),
    prisma.caseNote.findMany({ where: { caseId }, select: { id: true, body: true, createdAt: true } }),
    prisma.contradiction.findMany({
      where: { OR: [{ caseId1: caseId }, { caseId2: caseId }] },
      select: { id: true, description: true, severity: true, detectedAt: true },
    }),
    prisma.caseDiaryEntry.findMany({
      where: { caseId, isPrivileged: false },
      select: { id: true, entryType: true, summary: true, entryAt: true },
    }),
  ]);

  type TimelineItem = {
    type: string;
    title: string;
    description: string;
    sourceId: string;
    severity?: string;
    timestamp: string;
    meta?: Record<string, unknown>;
  };

  const items: TimelineItem[] = [];

  for (const f of facts) {
    items.push({
      type: "fact",
      title: f.factType.replace(/_/g, " "),
      description: f.content.slice(0, 200),
      sourceId: f.id,
      timestamp: (f.factDate ?? f.enteredAt).toISOString(),
    });
  }
  for (const d of documents) {
    items.push({
      type: "document",
      title: d.docType.replace(/_/g, " "),
      description: d.originalFilename ?? "Document uploaded",
      sourceId: d.id,
      timestamp: d.uploadedAt.toISOString(),
    });
  }
  for (const a of alerts) {
    items.push({
      type: "alert",
      title: a.title,
      description: a.description ?? "",
      sourceId: a.id,
      severity: a.severity,
      timestamp: a.createdAt.toISOString(),
    });
  }
  for (const c of custody) {
    items.push({
      type: "custody",
      title: c.eventType.replace(/_/g, " "),
      description: `Document ${c.documentId.slice(0, 8)}…`,
      sourceId: c.documentId,
      timestamp: c.occurredAt.toISOString(),
      meta: { custodyEventId: c.id },
    });
  }
  for (const n of notes) {
    items.push({
      type: "note",
      title: "Case note",
      description: n.body.slice(0, 200),
      sourceId: n.id,
      timestamp: n.createdAt.toISOString(),
    });
  }
  for (const x of contradictions) {
    items.push({
      type: "contradiction",
      title: "Contradiction",
      description: x.description.slice(0, 200),
      sourceId: x.id,
      severity: x.severity,
      timestamp: x.detectedAt.toISOString(),
    });
  }
  for (const d of diary) {
    items.push({
      type: "diary",
      title: d.entryType.replace(/_/g, " "),
      description: d.summary.slice(0, 200),
      sourceId: d.id,
      timestamp: d.entryAt.toISOString(),
    });
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items;
}

export async function getNetwork(caseId: string, userId: string, role: string) {
  await assertCaseAccessForUser(caseId, userId, role);

  const caseEntities = await prisma.caseEntity.findMany({
    where: { caseId },
    include: { entity: true },
  });

  const entityIds = caseEntities.map((ce) => ce.entityId);
  const nodes = new Map<string, { id: string; name: string; type: string; role?: string; riskScore?: number }>();
  const edges: Array<{ from: string; to: string; relationshipType: string; caseId?: string }> = [];

  for (const ce of caseEntities) {
    nodes.set(ce.entityId, {
      id: ce.entityId,
      name: ce.entity.name,
      type: ce.entity.type,
      role: ce.role,
      riskScore: ce.entity.riskScore,
    });
  }

  for (const entityId of entityIds.slice(0, 20)) {
    const hops = await graphRepository.traverseEntityNetwork(entityId, 2);
    for (const hop of hops) {
      const ent = await prisma.entity.findUnique({ where: { id: hop.entityId } });
      if (ent) {
        nodes.set(ent.id, { id: ent.id, name: ent.name, type: ent.type, riskScore: ent.riskScore });
        edges.push({
          from: entityId,
          to: hop.entityId,
          relationshipType: hop.relationshipType ?? "related",
        });
      }
    }
  }

  const rels = await prisma.entityRelationship.findMany({
    where: {
      OR: [
        { fromEntityId: { in: [...nodes.keys()] } },
        { toEntityId: { in: [...nodes.keys()] } },
      ],
    },
    take: 100,
  });
  for (const r of rels) {
    edges.push({
      from: r.fromEntityId,
      to: r.toEntityId,
      relationshipType: r.relationshipType,
      caseId: r.caseId ?? undefined,
    });
  }

  return { nodes: [...nodes.values()], edges };
}

export async function getAnalysis(caseId: string, userId: string, role: string) {
  await assertCaseAccessForUser(caseId, userId, role);

  const contradictions = await prisma.contradiction.findMany({
    where: { OR: [{ caseId1: caseId }, { caseId2: caseId }] },
  });
  const confirmed = contradictions.filter((c) => c.status === "confirmed");
  const open = contradictions.filter((c) => c.status !== "confirmed" && c.status !== "dismissed");

  const financialFacts = await prisma.fact.findMany({
    where: { caseId, factType: "financial_amount" },
    orderBy: { factDate: "asc" },
    include: { entity: { select: { id: true, name: true } } },
  });

  const criticalAlerts = await prisma.alert.count({
    where: { caseId, severity: "critical", status: { not: "acknowledged" } },
  });

  const score = await getCaseScore(caseId);

  const byCategory = financialFacts.reduce<Record<string, { total: number; count: number }>>((acc, f) => {
    const cat = f.amountCategory ?? "uncategorized";
    if (!acc[cat]) acc[cat] = { total: 0, count: 0 };
    const amt = f.amount ? Number(f.amount) : 0;
    acc[cat].total += amt;
    acc[cat].count += 1;
    return acc;
  }, {});

  return {
    contradictions: { confirmed: confirmed.length, open: open.length, items: contradictions },
    financialFacts,
    financialByCategory: byCategory,
    score,
    criticalAlerts,
  };
}

function exportPerm(profile: ExportProfile) {
  return profile === "publishable" ? "export_redacted" : profile === "redacted" ? "export_redacted" : "export_full";
}

export async function buildReportZip(
  caseId: string,
  userId: string,
  role: string,
  profileParam?: string
): Promise<Buffer> {
  const profile = parseExportProfile(profileParam);
  await assertCasePermission(caseId, userId, role, exportPerm(profile));
  const html = await generateEvidencePackageHtml(caseId, { profile });
  let pdfBuf: Buffer | null = null;
  try {
    pdfBuf = await htmlToPdfBuffer(html);
  } catch {
    pdfBuf = null;
  }

  await recordCustodyExport(caseId, userId, profile);

  const { ZipArchive } = await import("archiver");
  const archive = new ZipArchive({ zlib: { level: 9 } }) as unknown as ZipArchiver;

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const passthrough = new PassThrough();
    passthrough.on("data", (c) => chunks.push(c as Buffer));
    passthrough.on("end", () => resolve(Buffer.concat(chunks)));
    passthrough.on("error", reject);
    archive.on("error", reject);
    archive.pipe(passthrough);
    archive.append(html, { name: "evidence-report.html" });
    if (pdfBuf) archive.append(pdfBuf, { name: "evidence-report.pdf" });
    if (profile === "full") {
      void appendOriginalFiles(archive, caseId).then(() => archive.finalize());
    } else {
      archive.finalize();
    }
  });
}

async function appendOriginalFiles(archive: ZipArchiver, caseId: string) {
  const docs = await prisma.document.findMany({
    where: { caseId, s3Key: { not: null } },
  });
  if (!isS3Configured()) return;
  for (const d of docs) {
    if (!d.s3Key) continue;
    try {
      const buf = await downloadFromS3(d.s3Key);
      const name = d.originalFilename ?? `${d.docType}-${d.id.slice(0, 8)}`;
      archive.append(buf, { name: `files/${name}` });
    } catch {
      /* skip missing files */
    }
  }
}

async function recordCustodyExport(caseId: string, userId: string, profile: ExportProfile) {
  const docs = await prisma.document.findMany({ where: { caseId }, select: { id: true } });
  for (const d of docs) {
    await recordCustodyEvent({
      documentId: d.id,
      caseId,
      eventType: "exported",
      actorId: userId,
      payload: { exportType: "zip", exportProfile: profile },
    });
  }
  await writeAuditLog({
    eventType: profile === "full" ? "forensic.export_zip" : "forensic.export_redacted",
    userId,
    caseId,
    description: `Evidence ZIP export (${profile})`,
    result: "success",
    inputData: { profile },
  });
}

export async function exportReportHtml(caseId: string, userId: string, role: string, profileParam?: string) {
  const profile = parseExportProfile(profileParam);
  await assertCasePermission(caseId, userId, role, exportPerm(profile));
  await writeAuditLog({
    eventType: "forensic.export_html",
    userId,
    caseId,
    description: `Evidence HTML report (${profile})`,
    result: "success",
    inputData: { profile },
  });
  return generateEvidencePackageHtml(caseId, { profile });
}

export async function exportReportPdf(caseId: string, userId: string, role: string, profileParam?: string) {
  const profile = parseExportProfile(profileParam);
  await assertCasePermission(caseId, userId, role, exportPerm(profile));
  const html = await generateEvidencePackageHtml(caseId, { profile });
  const pdf = await htmlToPdfBuffer(html);
  await writeAuditLog({
    eventType: "forensic.export_pdf",
    userId,
    caseId,
    description: `Evidence PDF report (${profile})`,
    result: "success",
    inputData: { profile },
  });
  return pdf;
}
