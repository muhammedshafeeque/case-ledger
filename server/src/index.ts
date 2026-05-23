import "dotenv/config";

async function main() {
  if (process.env.USE_PGLITE === "true") {
    const { initPglitePrisma } = await import("./lib/prisma-pglite.js");
    const { setPrismaClient } = await import("./lib/prisma.js");
    setPrismaClient(await initPglitePrisma());
  }

  const { createApp } = await import("./app.js");
  const { getEnv } = await import("./config/env.js");
  const { logger } = await import("./lib/logger.js");

  const { ensureS3Buckets, isS3Configured, isMinio } = await import("./lib/s3.js");
  if (isS3Configured()) {
    await ensureS3Buckets();
  }

  const app = createApp();
  const port = getEnv().PORT;

  app.listen(port, () => {
    logger.info(`RTI Watch API listening on port ${port}`, {
      database: process.env.USE_PGLITE === "true" ? "pglite (embedded)" : "postgresql",
      storage: isS3Configured() ? (isMinio() ? "minio" : "s3") : "disabled",
    });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
