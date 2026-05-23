import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { z } from "zod";
import * as svc from "./imports.service.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";

const cdrSchema = z.object({
  csvText: z.string().min(1).optional(),
  csv: z.string().min(1).optional(),
  documentId: z.string().uuid().optional(),
}).refine((d) => Boolean(d.csvText?.trim() || d.csv?.trim()), { message: "csv required" });

export const importsRouter = Router({ mergeParams: true });
importsRouter.use(requireAuth);

importsRouter.post("/cdr", validate(cdrSchema), async (req, res, next) => {
  try {
    const csvText = (req.body.csvText ?? req.body.csv) as string;
    const data = await svc.importCdr(
      (req.params as { caseId: string }).caseId,
      req.user!.id,
      req.user!.role,
      csvText,
      req.body.documentId
    );
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
});

importsRouter.post("/ufed-manifest", async (req, res, next) => {
  try {
    res.json(successResponse({ status: "stub", message: "UFED manifest import not yet implemented" }));
  } catch (e) {
    next(e);
  }
});
