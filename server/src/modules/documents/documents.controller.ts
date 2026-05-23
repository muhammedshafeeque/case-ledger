import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import * as documentsService from "./documents.service.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";
import { prisma } from "../../lib/prisma.js";

const multerUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export const uploadMiddleware = multerUpload.single("file");

export async function uploadFile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: "No file uploaded" });
      return;
    }
    const { caseId, docType } = req.body;
    if (!caseId || !docType) {
      res.status(400).json({ success: false, error: "caseId and docType are required" });
      return;
    }
    const caseRecord = await prisma.rtiCase.findUnique({ where: { id: caseId } });
    if (!caseRecord) {
      res.status(404).json({ success: false, error: "Case not found" });
      return;
    }
    const result = await documentsService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      caseRecord.rtiId,
      docType
    );
    res.json(successResponse(result));
  } catch (e) {
    next(e);
  }
}

export async function commit(req: Request, res: Response, next: NextFunction) {
  try {
    const doc = await documentsService.commitDocument(req.body, req.user!.id);
    res.status(201).json(successResponse(doc));
  } catch (e) {
    next(e);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const doc = await documentsService.getDocument(req.params.id as string);
    res.json(successResponse(doc));
  } catch (e) {
    next(e);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const docs = await documentsService.listByCase(req.params.caseId as string);
    res.json(successResponse(docs));
  } catch (e) {
    next(e);
  }
}

export async function download(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await documentsService.downloadUrl(req.params.id as string);
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
}

export async function verify(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await documentsService.verifyHash(req.params.id as string);
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
}
