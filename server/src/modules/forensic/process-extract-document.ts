import { prisma } from "../../lib/prisma.js";
import { downloadFromS3, isS3Configured } from "../../lib/s3.js";
import { runRulePipeline } from "../intelligence/rules/rule-engine.js";
import { recordCustodyEvent } from "./custody.service.js";
import { extractTextFromPdf, extractViaCloudOcr, extractViaTesseract } from "./extraction.util.js";
import { logger } from "../../lib/logger.js";

export async function processExtractDocument(documentId: string, caseId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.caseId !== caseId) {
    throw new Error("Document not found");
  }

  const job = await prisma.forensicJob.findFirst({
    where: { documentId, jobType: "extract_document", status: { in: ["pending", "active"] } },
    orderBy: { createdAt: "desc" },
  });

  if (job) {
    await prisma.forensicJob.update({
      where: { id: job.id },
      data: { status: "active" },
    });
  }

  const extraction = await prisma.documentExtraction.create({
    data: { documentId, status: "processing" },
  });

  await prisma.document.update({
    where: { id: documentId },
    data: { processingStatus: "processing" },
  });

  try {
    let text = doc.textContent?.trim() ?? "";
    let source: "pdf_text" | "paste" | "cloud_ocr" | "tesseract" | "manual" = text ? "paste" : "pdf_text";
    let pageCount: number | null = null;

    if (!text && doc.s3Key && isS3Configured()) {
      const buffer = await downloadFromS3(doc.s3Key);
      const mime = doc.mimeType ?? "";

      if (mime.includes("pdf") || doc.originalFilename?.toLowerCase().endsWith(".pdf")) {
        const parsed = await extractTextFromPdf(buffer);
        text = parsed.text;
        pageCount = parsed.pageCount;
        source = "pdf_text";
      } else if (mime.startsWith("text/") || mime.includes("plain")) {
        text = buffer.toString("utf8");
        source = "manual";
      } else if (mime.startsWith("image/")) {
        text = await extractViaTesseract(buffer, mime);
        source = "tesseract";
      }

      if (!text) {
        const tess = await extractViaTesseract(buffer, mime);
        if (tess) {
          text = tess;
          source = "tesseract";
        } else {
          const ocrText = await extractViaCloudOcr(buffer, mime);
          if (ocrText) {
            text = ocrText;
            source = "cloud_ocr";
          }
        }
      }
    }

    if (!text && doc.textContent) {
      text = doc.textContent;
      source = "paste";
    }

    const status = text ? "done" : "failed";
    const error = text ? null : "No extractable text (scanned PDF may need cloud OCR)";

    await prisma.documentExtraction.update({
      where: { id: extraction.id },
      data: {
        status,
        source,
        extractedText: text || null,
        pageCount,
        error,
        completedAt: new Date(),
      },
    });

    await prisma.document.update({
      where: { id: documentId },
      data: {
        processingStatus: status === "done" ? "done" : "failed",
        textContent: text || doc.textContent,
        extractedAt: status === "done" ? new Date() : undefined,
      },
    });

    if (text) {
      await recordCustodyEvent({
        documentId,
        caseId,
        eventType: "extracted",
        payload: { source, pageCount },
      });
      await runRulePipeline(caseId, documentId);
    }

    if (job) {
      await prisma.forensicJob.update({
        where: { id: job.id },
        data: {
          status: status === "done" ? "completed" : "failed",
          completedAt: new Date(),
          result: { extractionId: extraction.id, source, charCount: text.length },
          error: error ?? undefined,
        },
      });
    }

    return { extractionId: extraction.id, status, textLength: text.length };
  } catch (err) {
    logger.error("Extract document failed", { documentId, error: String(err) });
    await prisma.documentExtraction.update({
      where: { id: extraction.id },
      data: { status: "failed", error: String(err), completedAt: new Date() },
    });
    await prisma.document.update({
      where: { id: documentId },
      data: { processingStatus: "failed" },
    });
    if (job) {
      await prisma.forensicJob.update({
        where: { id: job.id },
        data: { status: "failed", error: String(err), completedAt: new Date() },
      });
    }
    throw err;
  }
}
