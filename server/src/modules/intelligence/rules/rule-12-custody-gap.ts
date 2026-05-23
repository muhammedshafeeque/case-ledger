import { prisma } from "../../../lib/prisma.js";

export async function runCustodyGapRule(caseId: string) {
  const viewed = await prisma.chainOfCustodyEvent.findMany({
    where: { caseId, eventType: "viewed" },
    select: { documentId: true },
    distinct: ["documentId"],
  });

  for (const v of viewed) {
    const hasReceived = await prisma.chainOfCustodyEvent.findFirst({
      where: { documentId: v.documentId, eventType: { in: ["received", "stored", "hashed"] } },
    });
    if (hasReceived) continue;

    const existing = await prisma.alert.findFirst({
      where: { caseId, ruleId: "rule-12", description: { contains: v.documentId.slice(0, 8) } },
    });
    if (existing) continue;

    await prisma.alert.create({
      data: {
        caseId,
        alertType: "missing_document",
        severity: "high",
        title: "Document viewed without custody chain",
        description: `Document ${v.documentId.slice(0, 8)} was viewed but has no received/stored custody events.`,
        ruleId: "rule-12",
        sourceData: { documentId: v.documentId },
      },
    });
  }
}
