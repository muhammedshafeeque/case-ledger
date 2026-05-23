import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { z } from "zod";
import * as controller from "./forensic.controller.js";

const caseIdParam = z.object({ caseId: z.string().uuid() });
const docIdParam = z.object({ documentId: z.string().uuid() });

const annotationSchema = z.object({
  page: z.number().int().optional(),
  startOffset: z.number().int().optional(),
  endOffset: z.number().int().optional(),
  quote: z.string().min(1),
  label: z.enum(["redaction", "key_quote", "not_answered", "comment"]),
});

export const forensicRouter = Router({ mergeParams: true });
forensicRouter.use(requireAuth);

forensicRouter.get("/evidence", validate(caseIdParam, "params"), controller.evidence);
forensicRouter.get("/jobs", validate(caseIdParam, "params"), controller.jobs);
forensicRouter.get("/timeline", validate(caseIdParam, "params"), controller.timeline);
forensicRouter.get("/network", validate(caseIdParam, "params"), controller.network);
forensicRouter.get("/analysis", validate(caseIdParam, "params"), controller.analysis);
forensicRouter.get("/report.html", validate(caseIdParam, "params"), controller.reportHtml);
forensicRouter.get("/report.pdf", validate(caseIdParam, "params"), controller.reportPdf);
forensicRouter.get("/report.zip", validate(caseIdParam, "params"), controller.reportZip);

forensicRouter.post(
  "/documents/:documentId/verify",
  validate(z.object({ caseId: z.string().uuid(), documentId: z.string().uuid() }), "params"),
  controller.verify
);
forensicRouter.get(
  "/documents/:documentId/custody",
  validate(z.object({ caseId: z.string().uuid(), documentId: z.string().uuid() }), "params"),
  controller.custody
);

export const documentForensicRouter = Router();
documentForensicRouter.use(requireAuth);
documentForensicRouter.get("/:documentId/content", validate(docIdParam, "params"), controller.documentContent);
documentForensicRouter.get("/:documentId/annotations", validate(docIdParam, "params"), controller.listAnnotations);
documentForensicRouter.post(
  "/:documentId/annotations",
  validate(docIdParam, "params"),
  validate(annotationSchema),
  controller.createAnnotation
);
documentForensicRouter.delete(
  "/:documentId/annotations/:annotationId",
  validate(z.object({ documentId: z.string().uuid(), annotationId: z.string().uuid() }), "params"),
  controller.deleteAnnotation
);
