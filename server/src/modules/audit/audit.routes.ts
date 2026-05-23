import { Router } from "express";
import { requireAuth, requireRoles } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";
import { prisma } from "../../lib/prisma.js";
import { z } from "zod";

export const auditRouter = Router();
auditRouter.use(requireAuth);
auditRouter.use(requireRoles("admin"));

auditRouter.get("/", validate(z.object({
  caseId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
}), "query"), async (req, res, next) => {
  try {
    const q = req.query as unknown as { caseId?: string; userId?: string; limit: number };
    const where: Record<string, unknown> = {};
    if (q.caseId) where.caseId = q.caseId;
    if (q.userId) where.userId = q.userId;

    const rows = await prisma.auditLog.findMany({
      where: where as never,
      take: q.limit,
      orderBy: { occurredAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.json(successResponse(rows));
  } catch (e) { next(e); }
});
