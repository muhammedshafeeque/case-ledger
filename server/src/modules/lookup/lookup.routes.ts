import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";
import * as lookupService from "./lookup.service.js";
import { lookupSourceSchema } from "./lookup.types.js";
import { z } from "zod";

export const lookupRouter = Router();
lookupRouter.use(requireAuth);

lookupRouter.post("/preview", validate(z.object({
  source: lookupSourceSchema,
  query: z.record(z.unknown()),
  caseId: z.string().uuid(),
})), async (req, res, next) => {
  try {
    const data = lookupService.previewLookup(
      req.body.source,
      req.body.query,
      req.body.caseId,
      req.user!.id
    );
    res.json(successResponse(data));
  } catch (e) { next(e); }
});

lookupRouter.post("/execute", validate(z.object({
  confirmationToken: z.string().min(1),
  pastedData: z.unknown().optional(),
})), async (req, res, next) => {
  try {
    const data = await lookupService.executeLookup(
      req.body.confirmationToken,
      req.user!.id,
      req.body.pastedData
    );
    res.json(successResponse(data));
  } catch (e) { next(e); }
});

lookupRouter.post("/commit", validate(z.object({
  logId: z.string().uuid(),
  selectedFields: z.record(z.unknown()),
})), async (req, res, next) => {
  try {
    const data = await lookupService.commitLookup(
      req.body.logId,
      req.body.selectedFields,
      req.user!.id
    );
    res.json(successResponse(data));
  } catch (e) { next(e); }
});

lookupRouter.post("/reject", validate(z.object({ logId: z.string().uuid() })), async (req, res, next) => {
  try {
    const data = await lookupService.rejectLookup(req.body.logId, req.user!.id);
    res.json(successResponse(data));
  } catch (e) { next(e); }
});

lookupRouter.get("/log", validate(z.object({ caseId: z.string().uuid() }), "query"), async (req, res, next) => {
  try {
    const caseId = (req.query as { caseId: string }).caseId;
    const logs = await lookupService.listLookupLogs(caseId, req.user!.id);
    res.json(successResponse(logs));
  } catch (e) { next(e); }
});
