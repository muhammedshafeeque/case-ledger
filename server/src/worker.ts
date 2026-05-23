import "dotenv/config";
import { Worker, Queue } from "bullmq";
import { getRedis } from "./lib/redis.js";
import { logger } from "./lib/logger.js";
import { runNightlyDeadlineCheck } from "./modules/intelligence/rules/rule-engine.js";
import { getEnv } from "./config/env.js";
import { FORENSIC_QUEUE_NAME } from "./lib/forensic-queue.js";
import { processExtractDocument } from "./modules/forensic/process-extract-document.js";
import { processExtractMetadata } from "./modules/forensic/process-extract-metadata.js";

const connection = getRedis();

export const aiQueue = new Queue("ai-jobs", { connection });

const aiWorker = new Worker(
  "ai-jobs",
  async (job) => {
    logger.info("Processing job", { jobId: job.id, name: job.name });
    if (job.name === "nightly-deadlines") {
      await runNightlyDeadlineCheck();
    }
  },
  { connection }
);

aiWorker.on("completed", (job) => logger.info("AI job completed", { jobId: job.id }));
aiWorker.on("failed", (job, err) => logger.error("AI job failed", { jobId: job?.id, error: String(err) }));

const forensicWorker = new Worker(
  FORENSIC_QUEUE_NAME,
  async (job) => {
    logger.info("Forensic job", { jobId: job.id, name: job.name });
    if (job.name === "extract-document") {
      const { documentId, caseId } = job.data as { documentId: string; caseId: string };
      await processExtractDocument(documentId, caseId);
    } else if (job.name === "extract-metadata") {
      const { documentId, caseId } = job.data as { documentId: string; caseId: string };
      await processExtractMetadata(documentId, caseId);
    }
  },
  { connection }
);

forensicWorker.on("completed", (job) => logger.info("Forensic job completed", { jobId: job.id }));
forensicWorker.on("failed", (job, err) =>
  logger.error("Forensic job failed", { jobId: job?.id, error: String(err) })
);

async function scheduleNightly() {
  await aiQueue.add("nightly-deadlines", {}, {
    repeat: { pattern: "0 0 * * *" },
  });
}

scheduleNightly().catch((e) => logger.warn("Schedule failed", { error: String(e) }));

logger.info("RTI Watch worker started", { redis: getEnv().REDIS_URL });
