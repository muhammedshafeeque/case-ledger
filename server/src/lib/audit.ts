import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function writeAuditLog(params: {
  eventType: string;
  userId?: string;
  caseId?: string;
  description: string;
  inputData?: Prisma.InputJsonValue;
  result: "success" | "failure" | "rejected";
  ipAddress?: string;
  userAgent?: string;
}) {
  await prisma.auditLog.create({
    data: {
      eventType: params.eventType,
      userId: params.userId,
      caseId: params.caseId,
      description: params.description,
      inputData: (params.inputData ?? {}) as Prisma.InputJsonValue,
      result: params.result,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}
