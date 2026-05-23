import type { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";
import { writeAuditLog } from "../../lib/audit.js";

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body);
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    await writeAuditLog({
      eventType: "login",
      userId: result.user.id,
      description: `User ${result.user.email} logged in`,
      result: "success",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.json(successResponse({ accessToken: result.accessToken, user: result.user }));
  } catch (e) {
    next(e);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) return next();
    const result = await authService.refreshSession(token);
    res.json(successResponse(result));
  } catch (e) {
    next(e);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (token) await authService.logout(token);
    res.clearCookie("refreshToken");
    if (req.user) {
      await writeAuditLog({
        eventType: "logout",
        userId: req.user.id,
        description: "User logged out",
        result: "success",
      });
    }
    res.json(successResponse({ ok: true }));
  } catch (e) {
    next(e);
  }
}

export async function setup2fa(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.setupTotp(req.user!.id);
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
}

export async function verify2fa(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.enableTotp(req.user!.id, req.body.code);
    res.json(successResponse({ enabled: true }));
  } catch (e) {
    next(e);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const { userRepository } = await import("./repositories/user.repository.js");
    const user = await userRepository.findById(req.user!.id);
    if (!user) return next();
    res.json(successResponse(userRepository.toResponse(user)));
  } catch (e) {
    next(e);
  }
}

export async function updatePreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const { userRepository } = await import("./repositories/user.repository.js");
    const user = await userRepository.updatePreferences(req.user!.id, req.body);
    res.json(successResponse(userRepository.toResponse(user)));
  } catch (e) {
    next(e);
  }
}
