import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";
import { z } from "zod";
import * as notesService from "./notes.service.js";
import { createNoteSchema, updateNoteSchema } from "./schemas/note.schema.js";

export const caseNotesRouter = Router({ mergeParams: true });
caseNotesRouter.use(requireAuth);

caseNotesRouter.get("/", validate(z.object({ caseId: z.string().uuid() }), "params"), async (req, res, next) => {
  try {
    const rows = await notesService.listByCase(req.params.caseId as string);
    res.json(successResponse(rows));
  } catch (e) { next(e); }
});

caseNotesRouter.post("/", validate(z.object({ caseId: z.string().uuid() }), "params"), validate(createNoteSchema), async (req, res, next) => {
  try {
    const note = await notesService.createNote(req.params.caseId as string, req.body, req.user!.id);
    res.status(201).json(successResponse(note));
  } catch (e) { next(e); }
});

export const notesRouter = Router();
notesRouter.use(requireAuth);

notesRouter.patch("/:id", validate(z.object({ id: z.string().uuid() }), "params"), validate(updateNoteSchema), async (req, res, next) => {
  try {
    const note = await notesService.updateNote(req.params.id as string, req.user!.id, req.user!.role, req.body);
    res.json(successResponse(note));
  } catch (e) { next(e); }
});

notesRouter.delete("/:id", validate(z.object({ id: z.string().uuid() }), "params"), async (req, res, next) => {
  try {
    const result = await notesService.deleteNote(req.params.id as string, req.user!.id, req.user!.role);
    res.json(successResponse(result));
  } catch (e) { next(e); }
});
