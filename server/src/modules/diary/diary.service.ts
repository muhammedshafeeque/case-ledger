import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { assertCaseAccessForUser } from "../forensic/case-access.js";
import { assertCasePermission } from "../forensic/case-permissions.js";

export async function listDiary(caseId: string, userId: string, role: string) {
  await assertCaseAccessForUser(caseId, userId, role);
  return prisma.caseDiaryEntry.findMany({
    where: { caseId },
    orderBy: { entryAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

export async function createDiary(
  caseId: string,
  userId: string,
  role: string,
  data: {
    entryAt: string;
    entryType: string;
    summary: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    officerIds?: string[];
    isPrivileged?: boolean;
  }
) {
  await assertCasePermission(caseId, userId, role, "edit");
  return prisma.caseDiaryEntry.create({
    data: {
      caseId,
      entryAt: new Date(data.entryAt),
      entryType: data.entryType as never,
      summary: data.summary,
      location: data.location,
      latitude: data.latitude,
      longitude: data.longitude,
      officerIds: data.officerIds ?? [],
      isPrivileged: data.isPrivileged ?? false,
      createdById: userId,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

export async function deleteDiary(entryId: string, userId: string, role: string) {
  const entry = await prisma.caseDiaryEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw AppError.notFound();
  await assertCasePermission(entry.caseId, userId, role, "edit");
  await prisma.caseDiaryEntry.delete({ where: { id: entryId } });
}

export async function listInterviews(caseId: string, userId: string, role: string) {
  await assertCaseAccessForUser(caseId, userId, role);
  return prisma.interviewRecord.findMany({
    where: { caseId },
    orderBy: { conductedAt: "desc" },
    include: { person: { select: { id: true, name: true } } },
  });
}

export async function createInterview(
  caseId: string,
  userId: string,
  role: string,
  data: {
    personEntityId: string;
    conductedAt: string;
    location?: string;
    officers?: string[];
    summary: string;
    documentId?: string;
    isSealed?: boolean;
  }
) {
  await assertCasePermission(caseId, userId, role, "edit");
  return prisma.interviewRecord.create({
    data: {
      caseId,
      personEntityId: data.personEntityId,
      conductedAt: new Date(data.conductedAt),
      location: data.location,
      officers: data.officers ?? [],
      summary: data.summary,
      documentId: data.documentId,
      isSealed: data.isSealed ?? false,
      createdById: userId,
    },
    include: { person: { select: { id: true, name: true } } },
  });
}
