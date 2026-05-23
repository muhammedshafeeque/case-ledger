import { prisma } from "../../../lib/prisma.js";

export async function runCrossCaseEntityRule(caseId: string) {
  const entities = await prisma.caseEntity.findMany({
    where: { caseId },
    select: { entityId: true, entity: { select: { name: true } } },
  });

  for (const ce of entities) {
    const otherCases = await prisma.caseEntity.count({
      where: { entityId: ce.entityId, caseId: { not: caseId } },
    });
    if (otherCases < 1) continue;

    const existing = await prisma.alert.findFirst({
      where: {
        caseId,
        ruleId: "rule-10",
        title: { contains: ce.entity.name },
      },
    });
    if (existing) continue;

    await prisma.alert.create({
      data: {
        caseId,
        alertType: "entity_risk",
        severity: otherCases >= 3 ? "high" : "medium",
        title: `Entity appears in ${otherCases + 1} investigations`,
        description: `${ce.entity.name} is linked to ${otherCases} other case(s) besides this one.`,
        ruleId: "rule-10",
        sourceData: { entityId: ce.entityId, otherCaseCount: otherCases },
      },
    });
  }
}
