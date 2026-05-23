import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { z } from "zod";
import * as diaryService from "./diary.service.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";

const createSchema = z.object({
  entryAt: z.string().datetime({ offset: true }).or(z.string().date()),
  entryType: z.enum(["patrol", "interview", "seizure", "court", "other"]),
  summary: z.string().min(1),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  officerIds: z.array(z.string()).optional(),
  isPrivileged: z.boolean().optional(),
});

export const diaryRouter = Router({ mergeParams: true });
diaryRouter.use(requireAuth);

diaryRouter.get("/", async (req, res, next) => {
  try {
    const data = await diaryService.listDiary(
      (req.params as { caseId: string }).caseId,
      req.user!.id,
      req.user!.role
    );
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
});

diaryRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const data = await diaryService.createDiary(
      (req.params as { caseId: string }).caseId,
      req.user!.id,
      req.user!.role,
      req.body
    );
    res.status(201).json(successResponse(data));
  } catch (e) {
    next(e);
  }
});

const interviewSchema = z.object({
  personEntityId: z.string().uuid(),
  conductedAt: z.string().datetime({ offset: true }).or(z.string().date()),
  location: z.string().optional(),
  officers: z.array(z.string()).optional(),
  summary: z.string().min(1),
  documentId: z.string().uuid().optional(),
  isSealed: z.boolean().optional(),
});

diaryRouter.get("/interviews", async (req, res, next) => {
  try {
    const data = await diaryService.listInterviews(
      (req.params as { caseId: string }).caseId,
      req.user!.id,
      req.user!.role
    );
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
});

diaryRouter.post("/interviews", validate(interviewSchema), async (req, res, next) => {
  try {
    const data = await diaryService.createInterview(
      (req.params as { caseId: string }).caseId,
      req.user!.id,
      req.user!.role,
      req.body
    );
    res.status(201).json(successResponse(data));
  } catch (e) {
    next(e);
  }
});

diaryRouter.delete("/:entryId", async (req, res, next) => {
  try {
    await diaryService.deleteDiary(req.params.entryId as string, req.user!.id, req.user!.role);
    res.json(successResponse({ deleted: true }));
  } catch (e) {
    next(e);
  }
});
