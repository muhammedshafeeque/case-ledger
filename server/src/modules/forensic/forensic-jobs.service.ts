import { prisma } from "../../lib/prisma.js";
import { enqueueExtractDocument, enqueueExtractMetadata } from "../../lib/forensic-queue.js";

export async function createExtractJob(documentId: string, caseId: string) {
  const bullmqJobId = await enqueueExtractDocument(documentId, caseId);
  return prisma.forensicJob.create({
    data: {
      caseId,
      documentId,
      jobType: "extract_document",
      status: "pending",
      bullmqJobId: bullmqJobId ?? undefined,
    },
  });
}

export async function createMetadataJob(documentId: string, caseId: string) {
  const bullmqJobId = await enqueueExtractMetadata(documentId, caseId);
  return prisma.forensicJob.create({
    data: {
      caseId,
      documentId,
      jobType: "extract_metadata",
      status: "pending",
      bullmqJobId: bullmqJobId ?? undefined,
    },
  });
}

export async function listJobsForCase(caseId: string) {
  return prisma.forensicJob.findMany({
    where: { caseId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
