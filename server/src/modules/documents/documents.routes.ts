import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { commitDocumentSchema } from "./schemas/document.schema.js";
import * as controller from "./documents.controller.js";
import { z } from "zod";

export const documentsRouter = Router();
documentsRouter.use(requireAuth);

documentsRouter.post("/upload", controller.uploadMiddleware, controller.uploadFile);
documentsRouter.post("/", validate(commitDocumentSchema), controller.commit);
documentsRouter.get("/:id", validate(z.object({ id: z.string().uuid() }), "params"), controller.get);
documentsRouter.get("/:id/download", validate(z.object({ id: z.string().uuid() }), "params"), controller.download);
documentsRouter.get("/:id/verify", validate(z.object({ id: z.string().uuid() }), "params"), controller.verify);

export const caseDocumentsRouter = Router({ mergeParams: true });
caseDocumentsRouter.use(requireAuth);
caseDocumentsRouter.get("/", validate(z.object({ caseId: z.string().uuid() }), "params"), controller.list);
