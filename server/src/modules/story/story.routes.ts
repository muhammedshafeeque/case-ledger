import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { z } from "zod";
import * as svc from "./story.service.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(["hypothesis", "lead", "dead_end", "publishable"]),
  title: z.string().min(1),
  body: z.string(),
  sortOrder: z.number().int().optional(),
  status: z.string().optional(),
});

const pubSchema = z.object({
  embargoUntil: z.string().optional(),
  legalReviewStatus: z.string().optional(),
  publicationChecklist: z.record(z.boolean()).optional(),
  appealLevel: z.enum(["none", "first", "second", "sic"]).optional(),
  appealFiledAt: z.string().optional(),
  partialResponse: z.boolean().optional(),
});

export const storyRouter = Router({ mergeParams: true });
storyRouter.use(requireAuth);

storyRouter.get("/", async (req, res, next) => {
  try {
    const data = await svc.listStory((req.params as { caseId: string }).caseId, req.user!.id, req.user!.role);
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
});

storyRouter.post("/items", validate(itemSchema), async (req, res, next) => {
  try {
    const data = await svc.upsertStory((req.params as { caseId: string }).caseId, req.user!.id, req.user!.role, req.body);
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
});

storyRouter.patch("/publication", validate(pubSchema), async (req, res, next) => {
  try {
    const data = await svc.updatePublication((req.params as { caseId: string }).caseId, req.user!.id, req.user!.role, req.body);
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
});
