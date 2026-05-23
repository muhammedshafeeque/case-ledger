import { Router } from "express";
import { requireAuth, requireRoles } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { cursorPaginationQuerySchema } from "../../shared/schemas/pagination.schema.js";
import { createRtiCaseSchema, updateRtiCaseSchema, linkCasesSchema } from "./schemas/rti-case.schema.js";
import * as controller from "./cases.controller.js";
import { z } from "zod";

export const casesRouter = Router();
casesRouter.use(requireAuth);

casesRouter.get("/", validate(cursorPaginationQuerySchema, "query"), controller.list);
casesRouter.post("/", validate(createRtiCaseSchema), controller.create);
casesRouter.get("/:id", validate(z.object({ id: z.string().uuid() }), "params"), controller.get);
casesRouter.patch("/:id", validate(z.object({ id: z.string().uuid() }), "params"), validate(updateRtiCaseSchema), controller.update);
casesRouter.delete("/:id", requireRoles("admin"), validate(z.object({ id: z.string().uuid() }), "params"), controller.remove);
casesRouter.get("/:id/score", validate(z.object({ id: z.string().uuid() }), "params"), controller.score);
casesRouter.get("/:id/links", validate(z.object({ id: z.string().uuid() }), "params"), controller.listLinks);
casesRouter.post("/:id/link", validate(z.object({ id: z.string().uuid() }), "params"), validate(linkCasesSchema), controller.link);
casesRouter.get("/:id/evidence-package", validate(z.object({ id: z.string().uuid() }), "params"), async (req, res, next) => {
  try {
    const { generateEvidencePackageHtml } = await import("../legal/legal.service.js");
    const html = await generateEvidencePackageHtml(req.params.id as string);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (e) { next(e); }
});
