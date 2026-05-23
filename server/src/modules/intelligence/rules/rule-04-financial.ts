import { prisma } from "../../../lib/prisma.js";
import { Decimal } from "@prisma/client/runtime/library";

export async function runFinancialReconciliation(caseId: string) {
  const facts = await prisma.fact.findMany({
    where: { caseId, factType: "financial_amount", amountCategory: { not: null } },
  });

  const byCategory = new Map<string, Decimal[]>();
  for (const f of facts) {
    if (!f.amountCategory || !f.amount) continue;
    const list = byCategory.get(f.amountCategory) ?? [];
    list.push(f.amount);
    byCategory.set(f.amountCategory, list);
  }

  const pairs = [["budget_allocation", "total_payments_released"]] as const;
  for (const [a, b] of pairs) {
    const amountsA = byCategory.get(a);
    const amountsB = byCategory.get(b);
    if (!amountsA?.length || !amountsB?.length) continue;

    const sumA = amountsA.reduce((s, v) => s.add(v), new Decimal(0));
    const sumB = amountsB.reduce((s, v) => s.add(v), new Decimal(0));
    const diff = sumA.sub(sumB);
    if (diff.gt(0)) {
      await prisma.alert.create({
        data: {
          caseId,
          alertType: "financial_discrepancy",
          severity: "high",
          title: `Financial discrepancy: ${a} vs ${b}`,
          description: `Variance Rs.${diff.toString()} (${((diff.div(sumA)).mul(100)).toFixed(1)}%)`,
          ruleId: "RULE-04",
          formula: `${a} - ${b} = variance`,
          sourceData: { categoryA: a, sumA: sumA.toString(), sumB: sumB.toString(), variance: diff.toString() },
        },
      });
    }
  }
}
