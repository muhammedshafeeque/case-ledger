import type { RtiCase } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { daysBetween } from "../../../shared/utils/date.js";

export async function runPenaltyRule(caseRecord: RtiCase) {
  const today = new Date();
  const days = daysBetween(caseRecord.filedDate, today);
  if (days <= 30) return;

  const penaltyDays = days - 30;
  const dailyPenalty = 250;
  const totalPenalty = Math.min(penaltyDays * dailyPenalty, 25000);

  const existing = await prisma.alert.findFirst({
    where: { caseId: caseRecord.id, alertType: "penalty_accrual", status: { not: "dismissed" } },
  });
  if (existing) {
    await prisma.alert.update({
      where: { id: existing.id },
      data: {
        description: `S.20 penalty: Rs.${totalPenalty} (${penaltyDays} days × Rs.250, cap Rs.25,000)`,
        sourceData: { penaltyDays, dailyPenalty, totalPenalty, rule: "RULE-02" },
      },
    });
    return;
  }

  await prisma.alert.create({
    data: {
      caseId: caseRecord.id,
      alertType: "penalty_accrual",
      severity: "high",
      title: `Penalty accrued: Rs.${totalPenalty}`,
      description: `S.20: ${penaltyDays} days × Rs.250 = Rs.${totalPenalty} (max Rs.25,000)`,
      ruleId: "RULE-02",
      formula: "MIN((days_elapsed - 30) × 250, 25000)",
      sourceData: { penaltyDays, totalPenalty },
    },
  });
}
