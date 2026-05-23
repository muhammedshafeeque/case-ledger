import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";
import * as legalService from "./legal.service.js";
import { z } from "zod";

export const legalRouter = Router();
legalRouter.use(requireAuth);

legalRouter.get("/penalty/:caseId", validate(z.object({ caseId: z.string().uuid() }), "params"), async (req, res, next) => {
  try {
    const data = await legalService.getPenalty(req.params.caseId as string);
    res.json(successResponse(data));
  } catch (e) { next(e); }
});

legalRouter.get("/cases/:caseId/evidence-package", validate(z.object({ caseId: z.string().uuid() }), "params"), async (req, res, next) => {
  try {
    const html = await legalService.generateEvidencePackageHtml(req.params.caseId as string);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (e) { next(e); }
});
