import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";
import { prisma } from "../../lib/prisma.js";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

analyticsRouter.get("/dashboard", async (_req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [totalCases, byStatus, avgScore, criticalAlerts, overdueCases, highRiskCases] = await Promise.all([
      prisma.rtiCase.count(),
      prisma.rtiCase.groupBy({ by: ["status"], _count: true }),
      prisma.rtiCase.aggregate({ _avg: { corruptionScore: true } }),
      prisma.alert.count({ where: { severity: { in: ["critical", "high"] }, status: "unreviewed" } }),
      prisma.rtiCase.count({
        where: {
          dueDate: { lt: today },
          status: { notIn: ["closed_success", "closed_failure", "archived"] },
        },
      }),
      prisma.rtiCase.count({ where: { corruptionScore: { gte: 70 } } }),
    ]);
    res.json(successResponse({
      totalCases,
      byStatus,
      avgCorruptionScore: avgScore._avg.corruptionScore,
      criticalAlerts,
      overdueCases,
      highRiskCases,
    }));
  } catch (e) { next(e); }
});

analyticsRouter.get("/departments", async (_req, res, next) => {
  try {
    const rows = await prisma.rtiCase.groupBy({
      by: ["department"],
      _count: true,
      _avg: { corruptionScore: true },
    });
    res.json(successResponse(rows));
  } catch (e) { next(e); }
});

analyticsRouter.get("/export/cases", async (_req, res, next) => {
  try {
    const cases = await prisma.rtiCase.findMany({ take: 1000 });
    const header = "rtiId,title,department,status,corruptionScore,filedDate\n";
    const csv = cases.map((c) =>
      `${c.rtiId},"${c.title.replace(/"/g, '""')}",${c.department},${c.status},${c.corruptionScore},${c.filedDate.toISOString().slice(0, 10)}`
    ).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.send(header + csv);
  } catch (e) { next(e); }
});
