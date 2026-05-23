import { prisma } from "../../lib/prisma.js";

export async function globalSearch(
  q: string,
  limit: number,
  userId: string,
  role: string,
  opts?: { caseId?: string; investigationType?: string }
) {
  const term = q.trim();
  if (!term) return { cases: [], entities: [], facts: [], documents: [] };

  const caseWhere: Record<string, unknown> = {
    OR: [
      { title: { contains: term, mode: "insensitive" } },
      { department: { contains: term, mode: "insensitive" } },
      { rtiId: { contains: term, mode: "insensitive" } },
    ],
  };

  if (opts?.investigationType) {
    caseWhere.investigationType = opts.investigationType;
  }
  if (opts?.caseId) {
    caseWhere.id = opts.caseId;
  }

  if (role !== "admin") {
    caseWhere.AND = [{
      OR: [
        { createdById: userId },
        { accessList: { some: { userId } } },
        { isSensitive: false },
      ],
    }];
  }

  const docSearch = prisma.$queryRaw<Array<{ id: string; caseId: string; snippet: string; rank: number }>>`
    SELECT d.id, d.case_id AS "caseId",
      left(COALESCE(de.extracted_text, d.text_content, ''), 200) AS snippet,
      ts_rank(
        to_tsvector('english', COALESCE(de.extracted_text, d.text_content, '')),
        plainto_tsquery('english', ${term})
      ) AS rank
    FROM documents d
    LEFT JOIN LATERAL (
      SELECT extracted_text FROM document_extractions
      WHERE document_id = d.id AND status = 'done'
      ORDER BY created_at DESC LIMIT 1
    ) de ON true
    WHERE to_tsvector('english', COALESCE(de.extracted_text, d.text_content, ''))
      @@ plainto_tsquery('english', ${term})
    ORDER BY rank DESC
    LIMIT ${limit}
  `.catch(() => [] as Array<{ id: string; caseId: string; snippet: string; rank: number }>);

  const [cases, entities, facts, documents] = await Promise.all([
    prisma.rtiCase.findMany({
      where: caseWhere as never,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        rtiId: true,
        title: true,
        department: true,
        status: true,
        investigationType: true,
        corruptionScore: true,
      },
    }),
    prisma.entity.findMany({
      where: {
        name: { contains: term, mode: "insensitive" },
      },
      take: limit,
      orderBy: { riskScore: "desc" },
      select: { id: true, name: true, type: true, riskScore: true },
    }),
    prisma.fact.findMany({
      where: { content: { contains: term, mode: "insensitive" } },
      take: limit,
      orderBy: { enteredAt: "desc" },
      select: {
        id: true,
        content: true,
        factType: true,
        caseId: true,
        case: { select: { rtiId: true, title: true } },
      },
    }),
    docSearch,
  ]);

  return { cases, entities, facts, documents };
}
