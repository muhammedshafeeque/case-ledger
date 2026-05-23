import { prisma } from "../../../lib/prisma.js";

export async function runContradictionRule(caseId: string, documentId: string) {
  const newFacts = await prisma.fact.findMany({ where: { documentId } });

  for (const fact of newFacts) {
    if (fact.factType === "financial_amount" && fact.amountCategory) {
      const conflicts = await prisma.fact.findMany({
        where: {
          caseId,
          factType: "financial_amount",
          amountCategory: fact.amountCategory,
          id: { not: fact.id },
        },
      });
      for (const other of conflicts) {
        if (other.amount && fact.amount && !other.amount.equals(fact.amount)) {
          await createContradiction(fact, other, "financial", "numerical");
        }
      }
    }
  }
}

async function createContradiction(
  f1: { id: string; caseId: string; content: string; amount: unknown },
  f2: { id: string; caseId: string; content: string },
  type: "financial" | "statement",
  contradictionType: "numerical" | "statement"
) {
  const exists = await prisma.contradiction.findFirst({
    where: {
      OR: [
        { factId1: f1.id, factId2: f2.id },
        { factId1: f2.id, factId2: f1.id },
      ],
    },
  });
  if (exists) return;

  await prisma.contradiction.create({
    data: {
      factId1: f1.id,
      factId2: f2.id,
      caseId1: f1.caseId,
      caseId2: f2.caseId,
      contradictionType,
      description: `Conflicting ${type}: "${f1.content}" vs "${f2.content}"`,
      severity: type === "financial" ? "fraud_indicator" : "significant",
      confidence: 90,
    },
  });

  await prisma.alert.create({
    data: {
      caseId: f1.caseId,
      alertType: "contradiction",
      severity: "high",
      title: "Contradiction detected",
      description: `RULE-03: Conflicting facts in case`,
      ruleId: "RULE-03",
      sourceData: { factId1: f1.id, factId2: f2.id },
    },
  });
}
