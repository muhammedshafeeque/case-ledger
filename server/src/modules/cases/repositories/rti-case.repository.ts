import type { InvestigationType, Prisma, RtiCase } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";

const REF_PREFIX: Record<InvestigationType, string> = {
  rti: "RTI",
  audit: "AUD",
  procurement: "PRC",
  whistleblower: "WB",
  general: "INV",
  criminal: "CRIM",
  missing_persons: "MP",
  financial_crime: "FIN",
  cyber: "CYB",
  internal_affairs: "IA",
};

export class RtiCaseRepository {
  async generateRefId(investigationType: InvestigationType = "rti"): Promise<string> {
    const prefix = REF_PREFIX[investigationType];
    const year = new Date().getFullYear();
    const count = await prisma.rtiCase.count({
      where: { rtiId: { startsWith: `${prefix}-${year}-` } },
    });
    return `${prefix}-${year}-${String(count + 1).padStart(3, "0")}`;
  }

  create(data: Prisma.RtiCaseCreateInput) {
    return prisma.rtiCase.create({ data });
  }

  findById(id: string) {
    return prisma.rtiCase.findUnique({
      where: { id },
      include: {
        caseEntities: { include: { entity: true } },
        documents: { orderBy: { uploadedAt: "desc" } },
        alerts: { orderBy: { createdAt: "desc" }, take: 20 },
        facts: { orderBy: { enteredAt: "desc" }, take: 100, include: { entity: { select: { id: true, name: true, type: true } } } },
        notes: {
          orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
          include: { author: { select: { id: true, name: true } } },
        },
        tasks: { orderBy: { dueDate: "asc" }, take: 50 },
        linksFrom: {
          include: { toCase: { select: { id: true, rtiId: true, title: true, status: true } } },
        },
        linksTo: {
          include: { fromCase: { select: { id: true, rtiId: true, title: true, status: true } } },
        },
      },
    });
  }

  findMany(params: {
    where?: Prisma.RtiCaseWhereInput;
    cursor?: string;
    limit: number;
  }) {
    const { where, cursor, limit } = params;
    return prisma.rtiCase.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { updatedAt: "desc" },
    });
  }

  update(id: string, data: Prisma.RtiCaseUpdateInput) {
    return prisma.rtiCase.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return prisma.rtiCase.update({
      where: { id },
      data: { status: "archived" },
    });
  }

  toResponse(c: RtiCase) {
    return {
      id: c.id,
      rtiId: c.rtiId,
      investigationType: c.investigationType,
      title: c.title,
      department: c.department,
      pioOfficer: c.pioOfficer,
      status: c.status,
      priority: c.priority,
      filedDate: c.filedDate.toISOString().slice(0, 10),
      dueDate: c.dueDate.toISOString().slice(0, 10),
      responseDate: c.responseDate?.toISOString().slice(0, 10) ?? null,
      tags: c.tags,
      corruptionScore: c.corruptionScore,
      isPublic: c.isPublic,
      isSensitive: c.isSensitive,
      metadata: c.metadata as Record<string, unknown>,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}

export const rtiCaseRepository = new RtiCaseRepository();
