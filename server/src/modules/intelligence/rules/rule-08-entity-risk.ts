import { prisma } from "../../../lib/prisma.js";

export async function runEntityRiskRule(caseId: string) {
  const caseEntities = await prisma.caseEntity.findMany({
    where: { caseId },
    include: { entity: true },
  });

  for (const ce of caseEntities) {
    const entityId = ce.entityId;
    const involvedCases = await prisma.caseEntity.findMany({ where: { entityId } });
    const caseIds = involvedCases.map((x) => x.caseId);

    const contradictionCount = await prisma.contradiction.count({
      where: { OR: [{ caseId1: { in: caseIds } }, { caseId2: { in: caseIds } }] },
    });

    const highScoreCases = await prisma.rtiCase.count({
      where: { id: { in: caseIds }, corruptionScore: { gte: 70 } },
    });

    let risk = Math.min(100, contradictionCount * 15 + highScoreCases * 20);
    await prisma.entity.update({
      where: { id: entityId },
      data: { riskScore: risk, connectionCount: involvedCases.length },
    });
  }
}
