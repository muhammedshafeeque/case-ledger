import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function assertCaseAccessForUser(caseId: string, userId: string, role: string) {
  const c = await prisma.rtiCase.findUnique({ where: { id: caseId } });
  if (!c) throw AppError.notFound("Case not found");
  if (role === "admin") return c;
  if (!c.isSensitive) return c;
  if (c.createdById === userId) return c;
  const access = await prisma.caseAccess.findUnique({
    where: { caseId_userId: { caseId, userId } },
  });
  if (!access) throw AppError.forbidden("No access to sensitive case");
  return c;
}
