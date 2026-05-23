import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { graphRepository } from "./repositories/graph.repository.js";
import { cursorPaginationQuerySchema } from "../../shared/schemas/pagination.schema.js";
import type { z } from "zod";

export async function listEntities(query: z.infer<typeof cursorPaginationQuerySchema> & { search?: string; type?: string }) {
  const where: Record<string, unknown> = {};
  if (query.type) where.type = query.type;
  if (query.search) where.name = { contains: query.search, mode: "insensitive" };

  const rows = await prisma.entity.findMany({
    where: where as never,
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    orderBy: { riskScore: "desc" },
  });
  const hasMore = rows.length > query.limit;
  const items = hasMore ? rows.slice(0, query.limit) : rows;
  return {
    items,
    meta: { nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null, hasMore, limit: query.limit },
  };
}

export async function getEntity(id: string) {
  const entity = await prisma.entity.findUnique({
    where: { id },
    include: { caseEntities: { include: { case: true } } },
  });
  if (!entity) throw AppError.notFound();
  return entity;
}

export async function getNetwork(id: string, hops = 3) {
  const nodes = await graphRepository.traverseEntityNetwork(id, hops);
  return { rootId: id, nodes };
}

export async function createRelationship(fromId: string, toId: string, type: string, caseId?: string, notes?: string) {
  return prisma.entityRelationship.create({
    data: { fromEntityId: fromId, toEntityId: toId, relationshipType: type, caseId, notes },
  });
}

export async function listCasesForEntity(entityId: string, userId: string, role: string) {
  const links = await prisma.caseEntity.findMany({
    where: { entityId },
    include: {
      case: {
        select: {
          id: true,
          rtiId: true,
          title: true,
          investigationType: true,
          status: true,
          isSensitive: true,
          createdById: true,
        },
      },
    },
  });

  const out: Array<{ id: string; rtiId: string; title: string; investigationType: string; status: string }> = [];
  for (const l of links) {
    const c = l.case;
    if (role === "admin") {
      out.push(c);
      continue;
    }
    if (!c.isSensitive || c.createdById === userId) {
      out.push(c);
      continue;
    }
    const access = await prisma.caseAccess.findUnique({
      where: { caseId_userId: { caseId: c.id, userId } },
    });
    if (access) out.push(c);
  }
  return out;
}

export async function search(q: string) {
  const [entities, documents] = await Promise.all([
    graphRepository.searchEntities(q),
    graphRepository.fullTextSearch(q),
  ]);
  return { entities, documents };
}
