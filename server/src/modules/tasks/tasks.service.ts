import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { CreateTaskInput, UpdateTaskInput } from "./schemas/task.schema.js";

export async function listTasks(params: {
  caseId?: string;
  status?: string;
  assignedToId?: string;
  limit: number;
}) {
  const where: Record<string, unknown> = {};
  if (params.caseId) where.caseId = params.caseId;
  if (params.status) where.status = params.status;
  if (params.assignedToId) where.assignedToId = params.assignedToId;

  return prisma.task.findMany({
    where: where as never,
    take: params.limit,
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      case: { select: { id: true, rtiId: true, title: true } },
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function createTask(input: CreateTaskInput, userId: string) {
  if (input.caseId) {
    const c = await prisma.rtiCase.findUnique({ where: { id: input.caseId } });
    if (!c) throw AppError.notFound("Case not found");
  }

  return prisma.task.create({
    data: {
      caseId: input.caseId,
      title: input.title,
      description: input.description,
      priority: input.priority ?? "medium",
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      assignedToId: input.assignedToId,
      createdById: userId,
    },
    include: {
      case: { select: { id: true, rtiId: true, title: true } },
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function updateTask(taskId: string, input: UpdateTaskInput) {
  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) throw AppError.notFound();

  return prisma.task.update({
    where: { id: taskId },
    data: {
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : input.dueDate === null ? null : undefined,
      assignedToId: input.assignedToId,
    },
    include: {
      case: { select: { id: true, rtiId: true, title: true } },
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function deleteTask(taskId: string) {
  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) throw AppError.notFound();
  await prisma.task.delete({ where: { id: taskId } });
  return { deleted: true };
}
