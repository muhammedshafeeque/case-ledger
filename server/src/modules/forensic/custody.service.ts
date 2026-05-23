import type { CustodyEventType, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export async function recordCustodyEvent(params: {
  documentId: string;
  caseId: string;
  eventType: CustodyEventType;
  actorId?: string;
  payload?: Prisma.InputJsonValue;
}) {
  return prisma.chainOfCustodyEvent.create({
    data: {
      documentId: params.documentId,
      caseId: params.caseId,
      eventType: params.eventType,
      actorId: params.actorId,
      payload: (params.payload ?? {}) as Prisma.InputJsonValue,
    },
  });
}
