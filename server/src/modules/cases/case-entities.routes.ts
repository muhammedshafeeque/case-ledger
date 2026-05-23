import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";
import { z } from "zod";
import * as caseEntitiesService from "./case-entities.service.js";
import { addCasePersonSchema, updateCasePersonSchema } from "./schemas/case-entity.schema.js";

export const caseEntitiesRouter = Router({ mergeParams: true });
caseEntitiesRouter.use(requireAuth);

caseEntitiesRouter.get("/", validate(z.object({ caseId: z.string().uuid() }), "params"), async (req, res, next) => {
  try {
    const rows = await caseEntitiesService.listCasePersons(req.params.caseId as string);
    res.json(successResponse(rows));
  } catch (e) { next(e); }
});

caseEntitiesRouter.post("/", validate(z.object({ caseId: z.string().uuid() }), "params"), validate(addCasePersonSchema), async (req, res, next) => {
  try {
    const row = await caseEntitiesService.addPersonToCase(req.params.caseId as string, req.body);
    res.status(201).json(successResponse(row));
  } catch (e) { next(e); }
});

caseEntitiesRouter.patch("/:caseEntityId", validate(z.object({
  caseId: z.string().uuid(),
  caseEntityId: z.string().uuid(),
}), "params"), validate(updateCasePersonSchema), async (req, res, next) => {
  try {
    const row = await caseEntitiesService.updateCasePerson(req.params.caseEntityId as string, req.body);
    res.json(successResponse(row));
  } catch (e) { next(e); }
});

caseEntitiesRouter.delete("/:caseEntityId", validate(z.object({
  caseId: z.string().uuid(),
  caseEntityId: z.string().uuid(),
}), "params"), async (req, res, next) => {
  try {
    const result = await caseEntitiesService.removePersonFromCase(req.params.caseEntityId as string);
    res.json(successResponse(result));
  } catch (e) { next(e); }
});
