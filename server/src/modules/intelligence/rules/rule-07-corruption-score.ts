import { prisma } from "../../../lib/prisma.js";
import { daysBetween } from "../../../shared/utils/date.js";

export async function runCorruptionScoreRule(caseId: string) {
  const alerts = await prisma.alert.findMany({ where: { caseId, status: { not: "dismissed" } } });
  const contradictions = await prisma.contradiction.count({ where: { OR: [{ caseId1: caseId }, { caseId2: caseId }] } });
  const caseRecord = await prisma.rtiCase.findUnique({ where: { id: caseId } });
  if (!caseRecord) return;

  let score = 0;
  const breakdown: Record<string, number> = {};

  const illegalRejections = alerts.filter((a) => a.alertType === "invalid_exemption").length;
  score += illegalRejections * 15;
  breakdown.illegalRejections = illegalRejections * 15;

  score += contradictions * 20;
  breakdown.contradictions = contradictions * 20;

  const financial = alerts.filter((a) => a.alertType === "financial_discrepancy").length;
  score += financial * 25;
  breakdown.financial = financial * 25;

  const timeline = alerts.filter((a) => a.alertType === "timeline_anomaly").length;
  score += timeline * 15;
  breakdown.timeline = timeline * 15;

  const missing = alerts.filter((a) => a.alertType === "missing_document").length;
  score += missing * 10;
  breakdown.missing = missing * 10;

  const overdue = daysBetween(caseRecord.filedDate, new Date()) >= 30 ? 10 : 0;
  score += overdue;
  breakdown.overdue = overdue;

  score = Math.min(100, score);

  await prisma.rtiCase.update({
    where: { id: caseId },
    data: {
      corruptionScore: score,
      metadata: { ...(caseRecord.metadata as object), scoreBreakdown: breakdown },
    },
  });

  if (score >= 70) {
    const exists = await prisma.alert.findFirst({
      where: { caseId, alertType: "high_corruption_score", status: { not: "dismissed" } },
    });
    if (!exists) {
      await prisma.alert.create({
        data: {
          caseId,
          alertType: "high_corruption_score",
          severity: "critical",
          title: `High corruption score: ${score}`,
          description: "RULE-07 weighted formula exceeded threshold",
          ruleId: "RULE-07",
          sourceData: breakdown,
        },
      });
    }
  }
}
