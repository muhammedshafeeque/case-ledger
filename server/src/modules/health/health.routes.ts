import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { pingRedis } from "../../lib/redis.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json(successResponse({ status: "ok", service: "rti-watch-api" }));
});

healthRouter.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redisOk = await pingRedis();
    res.json(successResponse({ status: "ready", database: true, redis: redisOk }));
  } catch {
    res.status(503).json({ success: false, error: "Service not ready" });
  }
});
