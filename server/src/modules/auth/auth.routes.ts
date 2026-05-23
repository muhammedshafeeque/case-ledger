import { Router } from "express";
import cookieParser from "cookie-parser";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { loginSchema } from "./schemas/user.schema.js";
import * as controller from "./auth.controller.js";
import { z } from "zod";

export const authRouter = Router();
authRouter.use(cookieParser());

authRouter.post("/login", validate(loginSchema), controller.login);
authRouter.post("/refresh", controller.refresh);
authRouter.post("/logout", controller.logout);
authRouter.get("/me", requireAuth, controller.me);
authRouter.post("/2fa/setup", requireAuth, controller.setup2fa);
authRouter.post("/2fa/verify", requireAuth, validate(z.object({ code: z.string().length(6) })), controller.verify2fa);
authRouter.patch(
  "/me/preferences",
  requireAuth,
  validate(
    z.object({
      workspaceMode: z.enum(["accountability", "criminal", "newsroom"]).optional(),
      preferences: z.record(z.unknown()).optional(),
    })
  ),
  controller.updatePreferences
);
