import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../shared/errors/app-error.js";
import { errorResponse } from "../shared/schemas/envelope.schema.js";
import { logger } from "../lib/logger.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(errorResponse(err.message, { code: err.code, details: err.details }));
  }
  if (err instanceof ZodError) {
    return res.status(400).json(errorResponse("Validation failed", { issues: err.flatten() }));
  }
  logger.error("Unhandled error", { error: String(err), stack: err instanceof Error ? err.stack : undefined });
  return res.status(500).json(errorResponse("Internal server error"));
}
