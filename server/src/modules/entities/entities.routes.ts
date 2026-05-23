import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { cursorPaginationQuerySchema } from "../../shared/schemas/pagination.schema.js";
import * as service from "./entities.service.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";
import { z } from "zod";

export const entitiesRouter = Router();
entitiesRouter.use(requireAuth);

entitiesRouter.get("/", validate(cursorPaginationQuerySchema.extend({
  search: z.string().optional(),
  type: z.string().optional(),
}), "query"), async (req, res, next) => {
  try {
    const result = await service.listEntities(req.query as never);
    res.json(successResponse(result.items, result.meta));
  } catch (e) { next(e); }
});

entitiesRouter.get("/search", validate(z.object({ q: z.string().min(1) }), "query"), async (req, res, next) => {
  try {
    const data = await service.search(req.query.q as string);
    res.json(successResponse(data));
  } catch (e) { next(e); }
});

entitiesRouter.get("/:id", validate(z.object({ id: z.string().uuid() }), "params"), async (req, res, next) => {
  try {
    const data = await service.getEntity(req.params.id as string);
    res.json(successResponse(data));
  } catch (e) { next(e); }
});

entitiesRouter.get("/:id/cases", validate(z.object({ id: z.string().uuid() }), "params"), async (req, res, next) => {
  try {
    const data = await service.listCasesForEntity(
      req.params.id as string,
      req.user!.id,
      req.user!.role
    );
    res.json(successResponse(data));
  } catch (e) { next(e); }
});

entitiesRouter.get("/:id/network", validate(z.object({ id: z.string().uuid(), hops: z.coerce.number().optional() }), "params"), async (req, res, next) => {
  try {
    const data = await service.getNetwork(req.params.id as string, Number(req.query.hops) || 3);
    res.json(successResponse(data));
  } catch (e) { next(e); }
});

entitiesRouter.post("/relationships", validate(z.object({
  fromEntityId: z.string().uuid(),
  toEntityId: z.string().uuid(),
  relationshipType: z.string(),
  caseId: z.string().uuid().optional(),
  notes: z.string().optional(),
})), async (req, res, next) => {
  try {
    const data = await service.createRelationship(
      req.body.fromEntityId,
      req.body.toEntityId,
      req.body.relationshipType,
      req.body.caseId,
      req.body.notes
    );
    res.status(201).json(successResponse(data));
  } catch (e) { next(e); }
});
