import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { z } from "zod";
import * as svc from "./evidence-items.service.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";

const schema = z.object({
  itemNumber: z.string().min(1),
  description: z.string().min(1),
  seizedAt: z.string(),
  location: z.string().optional(),
  documentId: z.string().uuid().optional(),
});

export const evidenceItemsRouter = Router({ mergeParams: true });
evidenceItemsRouter.use(requireAuth);

evidenceItemsRouter.get("/", async (req, res, next) => {
  try {
    const data = await svc.listSeizures((req.params as { caseId: string }).caseId);
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
});

evidenceItemsRouter.post("/", validate(schema), async (req, res, next) => {
  try {
    const data = await svc.createSeizure(
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
