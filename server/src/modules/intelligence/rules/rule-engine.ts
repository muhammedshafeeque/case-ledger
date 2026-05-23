import { prisma } from "../../../lib/prisma.js";
import { runDeadlineRules } from "./rule-01-deadline.js";
import { runPenaltyRule } from "./rule-02-penalty.js";
import { runContradictionRule } from "./rule-03-contradiction.js";
import { runFinancialReconciliation } from "./rule-04-financial.js";
import { runMissingDocumentRule } from "./rule-05-missing-doc.js";
import { runTimelineAnomalyRule } from "./rule-06-timeline.js";
import { runCorruptionScoreRule } from "./rule-07-corruption-score.js";
import { runEntityRiskRule } from "./rule-08-entity-risk.js";
import { runEvasionClassifier } from "./rule-09-evasion.js";
import { runCrossCaseEntityRule } from "./rule-10-cross-case.js";
import { runDiaryGapRule } from "./rule-11-diary-gap.js";
import { runCustodyGapRule } from "./rule-12-custody-gap.js";

export async function runRulePipeline(caseId: string, documentId?: string) {
  const caseRecord = await prisma.rtiCase.findUnique({ where: { id: caseId } });
  if (!caseRecord) return;

  await runDeadlineRules(caseRecord);
  await runPenaltyRule(caseRecord);
  if (documentId) {
    await runContradictionRule(caseId, documentId);
    await runFinancialReconciliation(caseId);
    await runMissingDocumentRule(caseId, documentId);
    await runTimelineAnomalyRule(caseId);
    await runEvasionClassifier(caseId, documentId);
  }
  await runCorruptionScoreRule(caseId);
  await runEntityRiskRule(caseId);
  await runCrossCaseEntityRule(caseId);
  await runDiaryGapRule(caseId);
  await runCustodyGapRule(caseId);
}

export async function runNightlyDeadlineCheck() {
  const openCases = await prisma.rtiCase.findMany({
    where: { status: { in: ["submitted", "pending"] } },
  });
  for (const c of openCases) {
    await runDeadlineRules(c);
    await runPenaltyRule(c);
  }
}
