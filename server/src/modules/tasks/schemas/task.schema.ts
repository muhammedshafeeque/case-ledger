import { z } from "zod";

export const taskStatusSchema = z.enum(["open", "in_progress", "done", "cancelled"]);
export const casePrioritySchema = z.enum(["critical", "high", "medium", "low"]);

export const createTaskSchema = z.object({
  caseId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: casePrioritySchema.optional(),
  dueDate: z.string().date().optional(),
  assignedToId: z.string().uuid().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: taskStatusSchema.optional(),
  priority: casePrioritySchema.optional(),
  dueDate: z.string().date().nullable().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
