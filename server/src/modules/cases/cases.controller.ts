import type { Request, Response, NextFunction } from "express";
import * as casesService from "./cases.service.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await casesService.listCases({
      cursor: req.query.cursor as string | undefined,
      limit: Number(req.query.limit) || 20,
      status: req.query.status as string | undefined,
      priority: req.query.priority as string | undefined,
      investigationType: req.query.investigationType as string | undefined,
      q: req.query.q as string | undefined,
      userId: req.user!.id,
      role: req.user!.role,
    });
    res.json(successResponse(result.items, result.meta));
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await casesService.createCase(req.body, req.user!.id);
    res.status(201).json(successResponse(data));
  } catch (e) {
    next(e);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await casesService.getCase(req.params.id as string, req.user!.id, req.user!.role);
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await casesService.updateCase(req.params.id as string, req.body, req.user!.id, req.user!.role);
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { rtiCaseRepository } = await import("./repositories/rti-case.repository.js");
    await rtiCaseRepository.softDelete(req.params.id as string);
    res.json(successResponse({ deleted: true }));
  } catch (e) {
    next(e);
  }
}

export async function score(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await casesService.getCaseScore(req.params.id as string);
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
}

export async function listLinks(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await casesService.listCaseLinks(req.params.id as string);
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
}

export async function link(req: Request, res: Response, next: NextFunction) {
  try {
    await casesService.linkCases(
      req.params.id as string,
      req.body.toCaseId,
      req.body.linkType,
      req.body.strength ?? 50,
      req.body.notes
    );
    res.json(successResponse({ linked: true }));
  } catch (e) {
    next(e);
  }
}
