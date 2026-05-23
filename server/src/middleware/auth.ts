import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../modules/auth/auth.service.js";
import { AppError } from "../shared/errors/app-error.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(AppError.unauthorized());
  }
  try {
    const payload = await verifyAccessToken(header.slice(7));
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    next(AppError.unauthorized("Invalid or expired token"));
  }
}

export function requireRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden("Insufficient permissions"));
    }
    next();
  };
}
