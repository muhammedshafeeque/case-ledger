import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { runRulePipeline } from "../intelligence/rules/rule-engine.js";
import type { AddCasePersonInput, UpdateCasePersonInput } from "./schemas/case-entity.schema.js";

export async function listCasePersons(caseId: string) {
  const rows = await prisma.caseEntity.findMany({
    where: { caseId, entity: { type: "person" } },
    orderBy: { relevanceScore: "desc" },
    include: { entity: true },
  });
  return rows.map((ce) => ({
    caseEntityId: ce.id,
    role: ce.role,
    relevanceScore: ce.relevanceScore,
    id: ce.entity.id,
    name: ce.entity.name,
    designation: ce.entity.designation,
    riskScore: ce.entity.riskScore,
    verified: ce.entity.verified,
    type: ce.entity.type,
  }));
}

export async function addPersonToCase(caseId: string, input: AddCasePersonInput) {
  const caseRecord = await prisma.rtiCase.findUnique({ where: { id: caseId } });
  if (!caseRecord) throw AppError.notFound("Case not found");

  const role = input.role.trim();
  let entityId = input.entityId;

  if (entityId) {
    const existing = await prisma.entity.findUnique({ where: { id: entityId } });
    if (!existing) throw AppError.notFound("Entity not found");
    if (existing.type !== "person") throw AppError.badRequest("Entity is not a person");
  } else {
    const name = (input.name ?? "").trim();
    if (!name) throw AppError.badRequest("name is required");
    let entity = await prisma.entity.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, type: "person" },
    });
    if (!entity) {
      entity = await prisma.entity.create({
        data: {
          name,
          type: "person",
          designation: input.designation?.trim() || null,
        },
      });
    } else if (input.designation?.trim()) {
      entity = await prisma.entity.update({
        where: { id: entity.id },
        data: { designation: input.designation.trim() },
      });
    }
    entityId = entity.id;
  }

  const link = await prisma.caseEntity.upsert({
    where: {
      caseId_entityId_role: { caseId, entityId, role },
    },
    create: {
      caseId,
      entityId,
      role,
      relevanceScore: input.relevanceScore ?? 50,
    },
    update: {
      relevanceScore: input.relevanceScore ?? undefined,
    },
    include: { entity: true },
  });

  await runRulePipeline(caseId);
  return {
    caseEntityId: link.id,
    role: link.role,
    relevanceScore: link.relevanceScore,
    id: link.entity.id,
    name: link.entity.name,
    designation: link.entity.designation,
    riskScore: link.entity.riskScore,
    verified: link.entity.verified,
    type: link.entity.type,
  };
}

export async function updateCasePerson(caseEntityId: string, input: UpdateCasePersonInput) {
  const link = await prisma.caseEntity.findUnique({
    where: { id: caseEntityId },
    include: { entity: true },
  });
  if (!link) throw AppError.notFound();

  if (input.name !== undefined || input.designation !== undefined) {
    await prisma.entity.update({
      where: { id: link.entityId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.designation !== undefined ? { designation: input.designation.trim() || null } : {}),
      },
    });
  }

  const updated = await prisma.caseEntity.update({
    where: { id: caseEntityId },
    data: {
      ...(input.role !== undefined ? { role: input.role.trim() } : {}),
      ...(input.relevanceScore !== undefined ? { relevanceScore: input.relevanceScore } : {}),
    },
    include: { entity: true },
  });

  await runRulePipeline(link.caseId);
  return {
    caseEntityId: updated.id,
    role: updated.role,
    relevanceScore: updated.relevanceScore,
    id: updated.entity.id,
    name: updated.entity.name,
    designation: updated.entity.designation,
    riskScore: updated.entity.riskScore,
    verified: updated.entity.verified,
    type: updated.entity.type,
  };
}

export async function removePersonFromCase(caseEntityId: string) {
  const link = await prisma.caseEntity.findUnique({ where: { id: caseEntityId } });
  if (!link) throw AppError.notFound();
  await prisma.caseEntity.delete({ where: { id: caseEntityId } });
  await runRulePipeline(link.caseId);
  return { deleted: true };
}
