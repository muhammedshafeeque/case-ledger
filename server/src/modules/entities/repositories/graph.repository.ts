import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";

export type GraphNode = { entityId: string; hops: number; relationshipType?: string };

export class GraphRepository {
  async traverseEntityNetwork(entityId: string, maxHops = 3): Promise<GraphNode[]> {
    const rows = await prisma.$queryRaw<GraphNode[]>`
      WITH RECURSIVE entity_graph AS (
        SELECT from_entity_id, to_entity_id, relationship_type, 1 AS depth
        FROM entity_relationships
        WHERE from_entity_id = ${entityId}::uuid
        UNION ALL
        SELECT er.from_entity_id, er.to_entity_id, er.relationship_type, eg.depth + 1
        FROM entity_relationships er
        JOIN entity_graph eg ON er.from_entity_id = eg.to_entity_id
        WHERE eg.depth < ${maxHops}
      )
      SELECT DISTINCT to_entity_id AS "entityId", MIN(depth)::int AS hops, relationship_type AS "relationshipType"
      FROM entity_graph
      GROUP BY to_entity_id, relationship_type
      ORDER BY hops
    `;
    return rows;
  }

  async searchEntities(query: string, limit = 20) {
    return prisma.$queryRaw<{ id: string; name: string; similarity: number }[]>`
      SELECT id, name, similarity(name, ${query}) AS similarity
      FROM entities
      WHERE similarity(name, ${query}) > 0.3
      ORDER BY similarity DESC
      LIMIT ${limit}
    `.catch(() => {
      return prisma.entity.findMany({
        where: { name: { contains: query, mode: "insensitive" } },
        take: limit,
      }).then((rows) => rows.map((r) => ({ id: r.id, name: r.name, similarity: 1 })));
    });
  }

  async fullTextSearch(q: string, limit = 20) {
    return prisma.$queryRaw<{ id: string; caseId: string; rank: number }[]>`
      SELECT d.id, d.case_id AS "caseId", ts_rank(to_tsvector('english', COALESCE(text_content, '')), plainto_tsquery('english', ${q})) AS rank
      FROM documents d
      WHERE to_tsvector('english', COALESCE(text_content, '')) @@ plainto_tsquery('english', ${q})
      ORDER BY rank DESC
      LIMIT ${limit}
    `.catch(() => []);
  }
}

export const graphRepository = new GraphRepository();
