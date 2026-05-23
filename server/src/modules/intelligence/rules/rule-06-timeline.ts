import { prisma } from "../../../lib/prisma.js";
import { referencePrisma } from "../../../lib/reference-prisma.js";
import { daysBetween } from "../../../shared/utils/date.js";

const SEQUENCES = [
  ["tender_floated", "tender_awarded"],
  ["contract_signed", "work_commenced"],
  ["work_commenced", "work_completed"],
] as const;

export async function runTimelineAnomalyRule(caseId: string) {
  const dateFacts = await prisma.fact.findMany({
    where: { caseId, factType: "date", factDate: { not: null } },
  });

  for (const [startType, endType] of SEQUENCES) {
    const start = dateFacts.find((f) => f.content.includes(startType));
    const end = dateFacts.find((f) => f.content.includes(endType));
    if (!start?.factDate || !end?.factDate) continue;

    const actualDays = daysBetween(start.factDate, end.factDate);
    const timeline = await referencePrisma.processTimeline.findFirst({
      where: { processType: startType },
    });
    if (!timeline || actualDays >= timeline.minDays) continue;

    await prisma.alert.create({
      data: {
        caseId,
        alertType: "timeline_anomaly",
        severity: "high",
        title: `Timeline anomaly: ${startType} → ${endType}`,
        description: `Actual ${actualDays} days < minimum ${timeline.minDays} days`,
        ruleId: "RULE-06",
        formula: `actual_days < min_days (${timeline.minDays})`,
        sourceData: { startType, endType, actualDays, minDays: timeline.minDays },
      },
    });
  }
}
