import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { assertCaseAccessForUser } from "../forensic/case-access.js";

export async function listStory(caseId: string, userId: string, role: string) {
  await assertCaseAccessForUser(caseId, userId, role);
  return prisma.storyBoardItem.findMany({ where: { caseId }, orderBy: { sortOrder: "asc" } });
}

export async function upsertStory(
  caseId: string,
  userId: string,
  role: string,
  data: { id?: string; kind: string; title: string; body: string; sortOrder?: number; status?: string }
) {
  await assertCaseAccessForUser(caseId, userId, role);
  if (data.id) {
    const existing = await prisma.storyBoardItem.findUnique({ where: { id: data.id } });
    if (!existing || existing.caseId !== caseId) throw AppError.notFound();
    return prisma.storyBoardItem.update({
      where: { id: data.id },
      data: {
        kind: data.kind as never,
        title: data.title,
        body: data.body,
        sortOrder: data.sortOrder,
        status: data.status,
      },
    });
  }
  const max = await prisma.storyBoardItem.aggregate({
    where: { caseId },
    _max: { sortOrder: true },
  });
  return prisma.storyBoardItem.create({
    data: {
      caseId,
      kind: data.kind as never,
      title: data.title,
      body: data.body,
      sortOrder: data.sortOrder ?? (max._max.sortOrder ?? 0) + 1,
      status: data.status ?? "open",
    },
  });
}

export async function updatePublication(
  caseId: string,
  userId: string,
  role: string,
  data: {
    embargoUntil?: string;
    legalReviewStatus?: string;
    publicationChecklist?: Record<string, boolean>;
    appealLevel?: string;
    appealFiledAt?: string;
    partialResponse?: boolean;
  }
) {
  await assertCaseAccessForUser(caseId, userId, role);
  return prisma.rtiCase.update({
    where: { id: caseId },
    data: {
      embargoUntil: data.embargoUntil ? new Date(data.embargoUntil) : undefined,
      legalReviewStatus: data.legalReviewStatus,
      publicationChecklist: data.publicationChecklist as never,
      appealLevel: data.appealLevel as never,
      appealFiledAt: data.appealFiledAt ? new Date(data.appealFiledAt) : undefined,
      partialResponse: data.partialResponse,
    },
  });
}
