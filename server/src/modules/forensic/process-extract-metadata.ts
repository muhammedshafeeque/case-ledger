import { prisma } from "../../lib/prisma.js";
import { downloadFromS3, isS3Configured } from "../../lib/s3.js";
import { extractImageMetadata } from "./extraction.util.js";
import { logger } from "../../lib/logger.js";

export async function processExtractMetadata(documentId: string, caseId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.caseId !== caseId) throw new Error("Document not found");

  const job = await prisma.forensicJob.findFirst({
    where: { documentId, jobType: "extract_metadata", status: { in: ["pending", "active"] } },
    orderBy: { createdAt: "desc" },
  });
  if (job) {
    await prisma.forensicJob.update({ where: { id: job.id }, data: { status: "active" } });
  }

  try {
    let metadata: Record<string, unknown> = {};
    if (doc.s3Key && isS3Configured()) {
      const buffer = await downloadFromS3(doc.s3Key);
      const mime = doc.mimeType ?? "";
      if (mime.startsWith("image/")) {
        metadata = await extractImageMetadata(buffer);
      } else if (mime.includes("pdf")) {
        const { extractTextFromPdf } = await import("./extraction.util.js");
        const parsed = await extractTextFromPdf(buffer);
        metadata = { pageCount: parsed.pageCount };
      }
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { metadataExtracted: metadata as never },
    });

    if (job) {
      await prisma.forensicJob.update({
        where: { id: job.id },
        data: { status: "completed", completedAt: new Date(), result: metadata as never },
      });
    }
    return metadata;
  } catch (err) {
    logger.error("Extract metadata failed", { documentId, error: String(err) });
    if (job) {
      await prisma.forensicJob.update({
        where: { id: job.id },
        data: { status: "failed", error: String(err), completedAt: new Date() },
      });
    }
    throw err;
  }
}
