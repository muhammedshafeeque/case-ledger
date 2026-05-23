import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { prisma } from "../../lib/prisma.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";
import { cursorPaginationQuerySchema } from "../../shared/schemas/pagination.schema.js";
import { z } from "zod";

export const intelligenceRouter = Router();
intelligenceRouter.use(requireAuth);

intelligenceRouter.get("/alerts", validate(cursorPaginationQuerySchema.extend({
  caseId: z.string().uuid().optional(),
  status: z.string().optional(),
}), "query"), async (req, res, next) => {
  try {
    const q = req.query as unknown as { cursor?: string; limit: number; caseId?: string; status?: string };
    const where: Record<string, unknown> = {};
    if (q.caseId) where.caseId = q.caseId;
    if (q.status) where.status = q.status;
    const rows = await prisma.alert.findMany({
      where: where as never,
      take: q.limit + 1,
      orderBy: { createdAt: "desc" },
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > q.limit;
    res.json(successResponse(hasMore ? rows.slice(0, q.limit) : rows, { hasMore }));
  } catch (e) { next(e); }
});

intelligenceRouter.patch("/alerts/:id", validate(z.object({ id: z.string().uuid() }), "params"), validate(z.object({
  status: z.enum(["unreviewed", "acknowledged", "actioned", "dismissed"]),
})), async (req, res, next) => {
  try {
    const updated = await prisma.alert.update({
      where: { id: req.params.id as string },
      data: { status: req.body.status },
    });
    res.json(successResponse(updated));
  } catch (e) { next(e); }
});

intelligenceRouter.get("/contradictions", validate(cursorPaginationQuerySchema.extend({
  caseId: z.string().uuid().optional(),
}), "query"), async (req, res, next) => {
  try {
    const q = req.query as unknown as { cursor?: string; limit: number; caseId?: string };
    const where: Record<string, unknown> = {};
    if (q.caseId) {
      where.OR = [{ caseId1: q.caseId }, { caseId2: q.caseId }];
    }
    const rows = await prisma.contradiction.findMany({
      where: where as never,
      take: q.limit + 1,
      orderBy: { detectedAt: "desc" },
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > q.limit;
    res.json(successResponse(hasMore ? rows.slice(0, q.limit) : rows, { hasMore }));
  } catch (e) { next(e); }
});

intelligenceRouter.patch("/contradictions/:id", validate(z.object({ id: z.string().uuid() }), "params"), validate(z.object({
  status: z.enum(["unreviewed", "confirmed", "dismissed", "published"]),
})), async (req, res, next) => {
  try {
    const updated = await prisma.contradiction.update({
      where: { id: req.params.id as string },
      data: { status: req.body.status, reviewedAt: new Date(), reviewedById: req.user!.id },
    });
    res.json(successResponse(updated));
  } catch (e) { next(e); }
});
