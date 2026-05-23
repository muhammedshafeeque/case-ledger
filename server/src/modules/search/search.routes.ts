import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";
import { z } from "zod";
import * as searchService from "./search.service.js";

export const searchRouter = Router();
searchRouter.use(requireAuth);

searchRouter.get("/", validate(z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  caseId: z.string().uuid().optional(),
  investigationType: z.string().optional(),
}), "query"), async (req, res, next) => {
  try {
    const { q, limit, caseId, investigationType } = req.query as unknown as {
      q: string;
      limit: number;
      caseId?: string;
      investigationType?: string;
    };
    const result = await searchService.globalSearch(q, limit, req.user!.id, req.user!.role, {
      caseId,
      investigationType,
    });
    res.json(successResponse(result));
  } catch (e) { next(e); }
});
