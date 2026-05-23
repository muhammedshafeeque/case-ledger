import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { z } from "zod";
import * as svc from "./sources.service.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";

const createSchema = z.object({
  codename: z.string().min(1),
  realIdentity: z.string().min(1),
  contactMethod: z.string().optional(),
  notes: z.string().optional(),
});

export const sourcesRouter = Router({ mergeParams: true });
sourcesRouter.use(requireAuth);

sourcesRouter.get("/", async (req, res, next) => {
  try {
    const data = await svc.listSources((req.params as { caseId: string }).caseId, req.user!.id, req.user!.role);
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
});

sourcesRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const data = await svc.createSource((req.params as { caseId: string }).caseId, req.user!.id, req.user!.role, req.body);
    res.status(201).json(successResponse(data));
  } catch (e) {
    next(e);
  }
});

sourcesRouter.get("/:sourceId/reveal", async (req, res, next) => {
  try {
    const data = await svc.revealSource(req.params.sourceId as string, req.user!.id, req.user!.role);
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
});

sourcesRouter.delete("/:sourceId", async (req, res, next) => {
  try {
    await svc.deleteSource(req.params.sourceId as string, req.user!.id, req.user!.role);
    res.json(successResponse({ deleted: true }));
  } catch (e) {
    next(e);
  }
});
