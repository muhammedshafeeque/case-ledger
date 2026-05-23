import { Queue } from "bullmq";
import { getRedis } from "./redis.js";

export const FORENSIC_QUEUE_NAME = "forensic-jobs";

let forensicQueue: Queue | null = null;

export function getForensicQueue(): Queue {
  if (!forensicQueue) {
    forensicQueue = new Queue(FORENSIC_QUEUE_NAME, { connection: getRedis() });
  }
  return forensicQueue;
}

export async function enqueueExtractDocument(documentId: string, caseId: string) {
  const queue = getForensicQueue();
  const job = await queue.add("extract-document", { documentId, caseId });
  return job.id;
}

export async function enqueueExtractMetadata(documentId: string, caseId: string) {
  const queue = getForensicQueue();
  const job = await queue.add("extract-metadata", { documentId, caseId });
  return job.id;
}
