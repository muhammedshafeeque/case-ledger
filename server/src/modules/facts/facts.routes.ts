import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";
import { z } from "zod";
import * as factsService from "./facts.service.js";
import { createFactSchema, updateFactSchema } from "./schemas/fact.schema.js";

export const caseFactsRouter = Router({ mergeParams: true });
caseFactsRouter.use(requireAuth);

caseFactsRouter.get("/", validate(z.object({ caseId: z.string().uuid() }), "params"), async (req, res, next) => {
  try {
    const rows = await factsService.listByCase(req.params.caseId as string);
    res.json(successResponse(rows));
  } catch (e) { next(e); }
});

caseFactsRouter.post("/", validate(z.object({ caseId: z.string().uuid() }), "params"), validate(createFactSchema), async (req, res, next) => {
  try {
    const fact = await factsService.createFact(req.params.caseId as string, req.body, req.user!.id);
    res.status(201).json(successResponse(fact));
  } catch (e) { next(e); }
});

export const factsRouter = Router();
factsRouter.use(requireAuth);

factsRouter.patch("/:id", validate(z.object({ id: z.string().uuid() }), "params"), validate(updateFactSchema), async (req, res, next) => {
  try {
    const fact = await factsService.updateFact(req.params.id as string, req.body);
    res.json(successResponse(fact));
  } catch (e) { next(e); }
});

factsRouter.delete("/:id", validate(z.object({ id: z.string().uuid() }), "params"), async (req, res, next) => {
  try {
    const result = await factsService.deleteFact(req.params.id as string);
    res.json(successResponse(result));
  } catch (e) { next(e); }
});
