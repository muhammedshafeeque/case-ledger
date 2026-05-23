import { prisma } from "../../lib/prisma.js";
import { assertCasePermission } from "../forensic/case-permissions.js";
import { recordCustodyEvent } from "../forensic/custody.service.js";

export async function createSeizure(
  caseId: string,
  userId: string,
  role: string,
  data: {
    itemNumber: string;
    description: string;
    seizedAt: string;
    location?: string;
    documentId?: string;
  }
) {
  await assertCasePermission(caseId, userId, role, "add_evidence");

  const item = await prisma.evidenceItem.create({
    data: {
      caseId,
      itemNumber: data.itemNumber,
      description: data.description,
      seizedAt: new Date(data.seizedAt),
      seizedById: userId,
      location: data.location,
      documentId: data.documentId,
    },
  });

  if (data.documentId) {
    await recordCustodyEvent({
      documentId: data.documentId,
      caseId,
      eventType: "seized",
      actorId: userId,
      payload: { itemNumber: data.itemNumber, location: data.location },
    });
  }

  return item;
}

export async function listSeizures(caseId: string) {
  return prisma.evidenceItem.findMany({
    where: { caseId },
    orderBy: { seizedAt: "desc" },
    include: { seizedBy: { select: { name: true } } },
  });
}
