import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";
import { z } from "zod";
import * as tasksService from "./tasks.service.js";
import { createTaskSchema, updateTaskSchema } from "./schemas/task.schema.js";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

tasksRouter.get("/", validate(z.object({
  caseId: z.string().uuid().optional(),
  status: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}), "query"), async (req, res, next) => {
  try {
    const q = req.query as unknown as { caseId?: string; status?: string; assignedToId?: string; limit: number };
    const rows = await tasksService.listTasks(q);
    res.json(successResponse(rows));
  } catch (e) { next(e); }
});

tasksRouter.post("/", validate(createTaskSchema), async (req, res, next) => {
  try {
    const task = await tasksService.createTask(req.body, req.user!.id);
    res.status(201).json(successResponse(task));
  } catch (e) { next(e); }
});

tasksRouter.patch("/:id", validate(z.object({ id: z.string().uuid() }), "params"), validate(updateTaskSchema), async (req, res, next) => {
  try {
    const task = await tasksService.updateTask(req.params.id as string, req.body);
    res.json(successResponse(task));
  } catch (e) { next(e); }
});

tasksRouter.delete("/:id", validate(z.object({ id: z.string().uuid() }), "params"), async (req, res, next) => {
  try {
    const result = await tasksService.deleteTask(req.params.id as string);
    res.json(successResponse(result));
  } catch (e) { next(e); }
});

export const caseTasksRouter = Router({ mergeParams: true });
caseTasksRouter.use(requireAuth);

caseTasksRouter.get("/", validate(z.object({ caseId: z.string().uuid() }), "params"), async (req, res, next) => {
  try {
    const rows = await tasksService.listTasks({ caseId: req.params.caseId as string, limit: 50 });
    res.json(successResponse(rows));
  } catch (e) { next(e); }
});

caseTasksRouter.post("/", validate(z.object({ caseId: z.string().uuid() }), "params"), validate(createTaskSchema.omit({ caseId: true })), async (req, res, next) => {
  try {
    const task = await tasksService.createTask(
      { ...req.body, caseId: req.params.caseId as string },
      req.user!.id
    );
    res.status(201).json(successResponse(task));
  } catch (e) { next(e); }
});
