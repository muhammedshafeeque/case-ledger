import type { RtiCase } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { daysBetween } from "../../../shared/utils/date.js";

export async function runDeadlineRules(caseRecord: RtiCase) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = daysBetween(caseRecord.filedDate, today);

  if (!["submitted", "pending"].includes(caseRecord.status)) return;

  if (days === 25) {
    await upsertAlert(caseRecord.id, "deadline_warning", "medium", "RULE-01", `Day 25 warning: ${days} days elapsed`, { days, dueDate: caseRecord.dueDate });
  }
  if (days >= 30) {
    await upsertAlert(caseRecord.id, "deadline_overdue", "critical", "RULE-01", `Overdue: ${days} days since filing`, { days, penaltyStarts: true });
  }
}

async function upsertAlert(
  caseId: string,
  alertType: "deadline_warning" | "deadline_overdue",
  severity: "medium" | "critical",
  ruleId: string,
  title: string,
  sourceData: Record<string, unknown>
) {
  const existing = await prisma.alert.findFirst({
    where: { caseId, alertType, status: { not: "dismissed" } },
  });
  if (existing) return;
  await prisma.alert.create({
    data: {
      caseId,
      alertType,
      severity,
      title,
      description: title,
      ruleId,
      formula: "days_elapsed = today - filed_date",
      sourceData: sourceData as Prisma.InputJsonValue,
    },
  });
}
