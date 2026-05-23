import { prisma } from "../../../lib/prisma.js";
import { referencePrisma } from "../../../lib/reference-prisma.js";

export async function runMissingDocumentRule(caseId: string, documentId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.docType !== "response") return;

  const mandatory = await referencePrisma.mandatoryDocument.findMany({
    where: { responseType: "procurement", isMandatory: true },
  });

  const caseDocs = await prisma.document.findMany({ where: { caseId } });
  const types = new Set(caseDocs.map((d) => d.docType));

  for (const m of mandatory) {
    if (!types.has(m.docType as never)) {
      await prisma.alert.create({
        data: {
          caseId,
          alertType: "missing_document",
          severity: "medium",
          title: `Missing: ${m.docType}`,
          description: `RULE-05: Mandatory document not found. Basis: ${m.legalBasis ?? "RTI response requirements"}`,
          ruleId: "RULE-05",
          sourceData: { docType: m.docType, legalBasis: m.legalBasis },
        },
      });
    }
  }
}
