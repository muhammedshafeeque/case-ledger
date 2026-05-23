import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { encryptField, decryptField } from "../../lib/field-crypto.js";
import { writeAuditLog } from "../../lib/audit.js";
import { assertCaseAccessForUser } from "../forensic/case-access.js";
import { requireSourceRole } from "./sources.guard.js";

export async function listSources(caseId: string, userId: string, role: string) {
  requireSourceRole(role);
  await assertCaseAccessForUser(caseId, userId, role);
  const rows = await prisma.protectedSource.findMany({
    where: { caseId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      codename: true,
      contactMethod: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
  });
  return rows;
}

export async function createSource(
  caseId: string,
  userId: string,
  role: string,
  data: { codename: string; realIdentity: string; contactMethod?: string; notes?: string }
) {
  requireSourceRole(role);
  await assertCaseAccessForUser(caseId, userId, role);
  return prisma.protectedSource.create({
    data: {
      caseId,
      codename: data.codename,
      realIdentityEnc: encryptField(data.realIdentity),
      contactMethod: data.contactMethod,
      notesEnc: data.notes ? encryptField(data.notes) : null,
      createdById: userId,
    },
    select: { id: true, codename: true, contactMethod: true, createdAt: true },
  });
}

export async function revealSource(sourceId: string, userId: string, role: string) {
  requireSourceRole(role);
  const src = await prisma.protectedSource.findUnique({ where: { id: sourceId } });
  if (!src) throw AppError.notFound();
  await assertCaseAccessForUser(src.caseId, userId, role);
  await writeAuditLog({
    eventType: "source.identity_viewed",
    userId,
    caseId: src.caseId,
    description: `Source identity viewed: ${src.codename}`,
    result: "success",
  });
  return {
    id: src.id,
    codename: src.codename,
    realIdentity: decryptField(src.realIdentityEnc),
    contactMethod: src.contactMethod,
    notes: src.notesEnc ? decryptField(src.notesEnc) : null,
  };
}

export async function deleteSource(sourceId: string, userId: string, role: string) {
  requireSourceRole(role);
  const src = await prisma.protectedSource.findUnique({ where: { id: sourceId } });
  if (!src) throw AppError.notFound();
  await assertCaseAccessForUser(src.caseId, userId, role);
  await prisma.protectedSource.delete({ where: { id: sourceId } });
}
