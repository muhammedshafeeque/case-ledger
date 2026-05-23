import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { CreateNoteInput, UpdateNoteInput } from "./schemas/note.schema.js";

export async function listByCase(caseId: string) {
  return prisma.caseNote.findMany({
    where: { caseId },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { id: true, name: true, email: true } } },
  });
}

export async function createNote(caseId: string, input: CreateNoteInput, userId: string) {
  const caseRecord = await prisma.rtiCase.findUnique({ where: { id: caseId } });
  if (!caseRecord) throw AppError.notFound("Case not found");

  return prisma.caseNote.create({
    data: {
      caseId,
      authorId: userId,
      body: input.body,
      isPinned: input.isPinned ?? false,
    },
    include: { author: { select: { id: true, name: true, email: true } } },
  });
}

export async function updateNote(noteId: string, userId: string, role: string, input: UpdateNoteInput) {
  const note = await prisma.caseNote.findUnique({ where: { id: noteId } });
  if (!note) throw AppError.notFound();
  if (note.authorId !== userId && role !== "admin") throw AppError.forbidden();

  return prisma.caseNote.update({
    where: { id: noteId },
    data: input,
    include: { author: { select: { id: true, name: true, email: true } } },
  });
}

export async function deleteNote(noteId: string, userId: string, role: string) {
  const note = await prisma.caseNote.findUnique({ where: { id: noteId } });
  if (!note) throw AppError.notFound();
  if (note.authorId !== userId && role !== "admin") throw AppError.forbidden();
  await prisma.caseNote.delete({ where: { id: noteId } });
  return { deleted: true };
}
