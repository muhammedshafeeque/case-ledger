import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";
import { referencePrisma } from "../../lib/reference-prisma.js";
import { prisma } from "../../lib/prisma.js";
import { z } from "zod";

export const i18nRouter = Router();

i18nRouter.get("/translations", async (req, res, next) => {
  try {
    const locale = (req.query.locale as string) ?? "en";
    const rows = await referencePrisma.uiTranslation.findMany();
    const map: Record<string, string> = {};
    for (const r of rows) {
      map[r.key] = locale === "ml" ? r.malayalam : r.english;
    }
    res.json(successResponse(map));
  } catch (e) { next(e); }
});

i18nRouter.patch(
  "/users/locale",
  requireAuth,
  validate(z.object({ locale: z.enum(["en", "ml"]) })),
  async (req, res, next) => {
    try {
      const { locale } = req.body as { locale: string };
      await prisma.user.update({ where: { id: req.user!.id }, data: { locale } });
      res.json(successResponse({ locale }));
    } catch (e) { next(e); }
  }
);
