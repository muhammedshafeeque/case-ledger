import { addDays } from "../../shared/utils/date.js";
import { AppError } from "../../shared/errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { rtiCaseRepository } from "./repositories/rti-case.repository.js";
import type { CreateRtiCaseInput, UpdateRtiCaseInput } from "./schemas/rti-case.schema.js";
import { runRulePipeline } from "../intelligence/rules/rule-engine.js";

export async function createCase(input: CreateRtiCaseInput, userId: string) {
  const investigationType = input.investigationType ?? "rti";
  const rtiId = await rtiCaseRepository.generateRefId(investigationType);
  const filedDate = new Date(input.filedDate);
  const dueDate = addDays(filedDate, 30);

  const created = await rtiCaseRepository.create({
    rtiId,
    investigationType,
    title: input.title,
    department: input.department?.trim() || "—",
    pioOfficer: input.pioOfficer?.trim() || null,
    priority: input.priority ?? "medium",
    filedDate,
    dueDate,
    tags: input.tags ?? [],
    isSensitive: input.isSensitive ?? false,
    crimeNumber: input.crimeNumber ?? null,
    firNumber: input.firNumber ?? null,
    station: input.station ?? null,
    courtCaseNumber: input.courtCaseNumber ?? null,
    jurisdiction: input.jurisdiction ?? null,
    createdBy: { connect: { id: userId } },
  });

  await runRulePipeline(created.id);
  return rtiCaseRepository.toResponse(created);
}

export async function listCases(params: {
  cursor?: string;
  limit: number;
  status?: string;
  priority?: string;
  investigationType?: string;
  q?: string;
  userId: string;
  role: string;
}) {
  const where: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];
  if (params.status) where.status = params.status;
  if (params.priority) where.priority = params.priority;
  if (params.investigationType) where.investigationType = params.investigationType;
  if (params.q?.trim()) {
    const term = params.q.trim();
    and.push({
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { department: { contains: term, mode: "insensitive" } },
        { rtiId: { contains: term, mode: "insensitive" } },
      ],
    });
  }

  if (params.role !== "admin") {
    and.push({
      OR: [
        { createdById: params.userId },
        { accessList: { some: { userId: params.userId } } },
        { isSensitive: false },
      ],
    });
  }
  if (and.length) where.AND = and;

  const rows = await rtiCaseRepository.findMany({
    where: where as never,
    cursor: params.cursor,
    limit: params.limit,
  });

  const hasMore = rows.length > params.limit;
  const items = hasMore ? rows.slice(0, params.limit) : rows;

  return {
    items: items.map((c) => rtiCaseRepository.toResponse(c)),
    meta: {
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
      hasMore,
      limit: params.limit,
    },
  };
}

export async function getCase(id: string, userId: string, role: string) {
  const c = await rtiCaseRepository.findById(id);
  if (!c) throw AppError.notFound("Case not found");
  await assertCaseAccess(c.id, c.isSensitive, c.createdById, userId, role);
  return {
    ...rtiCaseRepository.toResponse(c),
    documents: c.documents,
    facts: c.facts,
    notes: c.notes,
    tasks: c.tasks,
    links: [
      ...c.linksFrom.map((l) => ({
        id: l.id,
        direction: "outgoing" as const,
        linkType: l.linkType,
        strength: l.strength,
        notes: l.notes,
        case: l.toCase,
      })),
      ...c.linksTo.map((l) => ({
        id: l.id,
        direction: "incoming" as const,
        linkType: l.linkType,
        strength: l.strength,
        notes: l.notes,
        case: l.fromCase,
      })),
    ],
    entities: c.caseEntities
      .filter((ce) => ce.entity.type === "person")
      .map((ce) => ({
        caseEntityId: ce.id,
        role: ce.role,
        relevanceScore: ce.relevanceScore,
        id: ce.entity.id,
        name: ce.entity.name,
        designation: ce.entity.designation,
        riskScore: ce.entity.riskScore,
        verified: ce.entity.verified,
        type: ce.entity.type,
      })),
    alerts: c.alerts,
  };
}

export async function listCaseLinks(caseId: string) {
  const [from, to] = await Promise.all([
    prisma.caseLink.findMany({
      where: { fromCaseId: caseId },
      include: { toCase: { select: { id: true, rtiId: true, title: true, status: true } } },
    }),
    prisma.caseLink.findMany({
      where: { toCaseId: caseId },
      include: { fromCase: { select: { id: true, rtiId: true, title: true, status: true } } },
    }),
  ]);
  return [
    ...from.map((l) => ({ ...l, direction: "outgoing" as const, linkedCase: l.toCase })),
    ...to.map((l) => ({ ...l, direction: "incoming" as const, linkedCase: l.fromCase })),
  ];
}

export async function updateCase(id: string, input: UpdateRtiCaseInput, userId: string, role: string) {
  const existing = await prisma.rtiCase.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound();
  await assertCaseAccess(id, existing.isSensitive, existing.createdById, userId, role);

  const data: Record<string, unknown> = { ...input };
  if (input.filedDate) {
    const filed = new Date(input.filedDate);
    data.filedDate = filed;
    data.dueDate = addDays(filed, 30);
  }
  if (input.responseDate) data.responseDate = new Date(input.responseDate);

  const updated = await rtiCaseRepository.update(id, data as never);
  await runRulePipeline(id);
  return rtiCaseRepository.toResponse(updated);
}

export async function linkCases(fromId: string, toCaseId: string, linkType: string, strength: number, notes?: string) {
  await prisma.caseLink.create({
    data: { fromCaseId: fromId, toCaseId, linkType, strength, notes },
  });
}

export async function getCaseScore(id: string) {
  const c = await prisma.rtiCase.findUnique({ where: { id } });
  if (!c) throw AppError.notFound();
  const meta = c.metadata as Record<string, unknown>;
  return {
    corruptionScore: c.corruptionScore,
    breakdown: meta.scoreBreakdown ?? {},
  };
}

async function assertCaseAccess(
  caseId: string,
  isSensitive: boolean,
  ownerId: string,
  userId: string,
  role: string
) {
  if (role === "admin") return;
  if (!isSensitive) return;
  if (ownerId === userId) return;
  const access = await prisma.caseAccess.findUnique({
    where: { caseId_userId: { caseId, userId } },
  });
  if (!access) throw AppError.forbidden("No access to sensitive case");
}
