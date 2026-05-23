import { prisma } from "../../../lib/prisma.js";
import { referencePrisma } from "../../../lib/reference-prisma.js";

export async function runEvasionClassifier(caseId: string, documentId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc?.notAnswered) return;

  const patterns = await referencePrisma.evasionPattern.findMany();
  const sections = await prisma.fact.findMany({
    where: { documentId, factType: "legal_section" },
  });

  for (const section of sections) {
    const match = patterns.find((p) => p.sectionCited === section.legalSection);
    if (match && match.validityAssessment === "likely_invalid") {
      await prisma.alert.create({
        data: {
          caseId,
          alertType: "invalid_exemption",
          severity: "high",
          title: `Likely invalid exemption: ${section.legalSection}`,
          description: match.counterArguments ?? match.description,
          ruleId: "RULE-09",
          sourceData: { patternId: match.patternId, section: section.legalSection },
        },
      });
    }
  }
}
