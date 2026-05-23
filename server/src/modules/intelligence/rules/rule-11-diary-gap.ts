import { prisma } from "../../../lib/prisma.js";

const CRIMINAL_TYPES = new Set(["criminal", "missing_persons", "financial_crime", "cyber", "internal_affairs"]);

export async function runDiaryGapRule(caseId: string) {
  const c = await prisma.rtiCase.findUnique({ where: { id: caseId } });
  if (!c || !CRIMINAL_TYPES.has(c.investigationType)) return;
  if (!["submitted", "pending", "partial_response"].includes(c.status)) return;

  const latest = await prisma.caseDiaryEntry.findFirst({
    where: { caseId },
    orderBy: { entryAt: "desc" },
  });
  const daysSince = latest
    ? (Date.now() - latest.entryAt.getTime()) / 86400000
    : (Date.now() - c.createdAt.getTime()) / 86400000;

  if (daysSince < 7) return;

  const existing = await prisma.alert.findFirst({
    where: { caseId, ruleId: "rule-11", status: "unreviewed" },
  });
  if (existing) return;

  await prisma.alert.create({
    data: {
      caseId,
      alertType: "timeline_anomaly",
      severity: "medium",
      title: "No case diary entry in 7+ days",
      description: `Active criminal investigation has no diary entry for ${Math.floor(daysSince)} days.`,
      ruleId: "rule-11",
      sourceData: { daysSince },
    },
  });
}
