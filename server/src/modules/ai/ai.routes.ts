import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";
import * as aiService from "./ai.service.js";
import { z } from "zod";

export const aiRouter = Router();
aiRouter.use(requireAuth);

aiRouter.post("/chat", validate(z.object({
  message: z.string().min(1),
  caseId: z.string().uuid().optional(),
})), async (req, res, next) => {
  try {
    const result = await aiService.chat(req.body.message, req.body.caseId, req.user!.id);
    res.json(successResponse(result));
  } catch (e) { next(e); }
});

aiRouter.post("/draft-appeal", validate(z.object({
  caseId: z.string().uuid(),
  appealType: z.enum(["first_appeal", "second_appeal", "sic_complaint"]),
})), async (req, res, next) => {
  try {
    const result = await aiService.draftAppeal(req.body.caseId, req.body.appealType, req.user!.id);
    res.json(successResponse(result));
  } catch (e) { next(e); }
});

aiRouter.post("/draft-application", validate(z.object({
  department: z.string(),
  subject: z.string(),
  questions: z.array(z.string()),
})), async (req, res, next) => {
  try {
    const result = await aiService.callGroq(
      "Draft RTI application under RTI Act 2005 for Kerala.",
      JSON.stringify(req.body),
      req.user!.id
    );
    res.json(successResponse(result));
  } catch (e) { next(e); }
});

aiRouter.post("/summarise-doc", validate(z.object({ documentId: z.string().uuid() })), async (req, res, next) => {
  try {
    const { prisma } = await import("../../lib/prisma.js");
    const doc = await prisma.document.findUnique({ where: { id: req.body.documentId } });
    const result = await aiService.callGroq(
      "Summarise RTI document: answered, evaded, red flags.",
      JSON.stringify(doc),
      req.user!.id
    );
    res.json(successResponse(result));
  } catch (e) { next(e); }
});
