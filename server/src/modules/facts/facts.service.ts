import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { runRulePipeline } from "../intelligence/rules/rule-engine.js";
import type { CreateFactInput, UpdateFactInput } from "./schemas/fact.schema.js";

async function getOrCreateManualDocument(caseId: string, userId: string) {
  const existing = await prisma.document.findFirst({
    where: { caseId, docType: "evidence", textContent: "__manual_entry__" },
  });
  if (existing) return existing;
  return prisma.document.create({
    data: {
      caseId,
      docType: "evidence",
      textContent: "__manual_entry__",
      uploadedById: userId,
      isVerified: false,
    },
  });
}

export async function listByCase(caseId: string) {
  return prisma.fact.findMany({
    where: { caseId },
    orderBy: [{ factDate: "desc" }, { enteredAt: "desc" }],
    include: { entity: { select: { id: true, name: true, type: true } } },
  });
}

export async function createFact(caseId: string, input: CreateFactInput, userId: string) {
  const caseRecord = await prisma.rtiCase.findUnique({ where: { id: caseId } });
  if (!caseRecord) throw AppError.notFound("Case not found");

  const doc = await getOrCreateManualDocument(caseId, userId);
  let entityRefId: string | undefined;
  if (input.entityName) {
    let ent = await prisma.entity.findFirst({ where: { name: input.entityName } });
    if (!ent) ent = await prisma.entity.create({ data: { name: input.entityName, type: "person" } });
    entityRefId = ent.id;
  }

  const fact = await prisma.fact.create({
    data: {
      caseId,
      documentId: doc.id,
      factType: input.factType,
      content: input.content,
      amount: input.amount,
      amountCategory: input.amountCategory,
      factDate: input.factDate ? new Date(input.factDate) : null,
      entityRefId,
      legalSection: input.legalSection,
      confidence: input.confidence ?? "confirmed",
      enteredById: userId,
    },
    include: { entity: { select: { id: true, name: true, type: true } } },
  });

  await runRulePipeline(caseId, doc.id);
  return fact;
}

export async function updateFact(factId: string, input: UpdateFactInput) {
  const existing = await prisma.fact.findUnique({ where: { id: factId } });
  if (!existing) throw AppError.notFound();

  const fact = await prisma.fact.update({
    where: { id: factId },
    data: {
      content: input.content,
      amount: input.amount,
      amountCategory: input.amountCategory,
      factDate: input.factDate ? new Date(input.factDate) : undefined,
      legalSection: input.legalSection,
      confidence: input.confidence,
    },
    include: { entity: { select: { id: true, name: true, type: true } } },
  });

  await runRulePipeline(existing.caseId);
  return fact;
}

export async function deleteFact(factId: string) {
  const existing = await prisma.fact.findUnique({ where: { id: factId } });
  if (!existing) throw AppError.notFound();
  await prisma.fact.delete({ where: { id: factId } });
  await runRulePipeline(existing.caseId);
  return { deleted: true };
}
