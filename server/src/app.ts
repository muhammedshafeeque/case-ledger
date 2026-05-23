import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { getAllowedOrigins } from "./config/env.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { httpLoggerMiddleware } from "./middleware/http-logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { authRouter } from "./modules/auth/index.js";
import { casesRouter } from "./modules/cases/index.js";
import { caseEntitiesRouter } from "./modules/cases/case-entities.routes.js";
import { documentsRouter, caseDocumentsRouter } from "./modules/documents/index.js";
import { entitiesRouter } from "./modules/entities/index.js";
import { intelligenceRouter } from "./modules/intelligence/index.js";
import { aiRouter } from "./modules/ai/index.js";
import { lookupRouter } from "./modules/lookup/index.js";
import { legalRouter } from "./modules/legal/index.js";
import { analyticsRouter } from "./modules/analytics/index.js";
import { i18nRouter } from "./modules/i18n/index.js";
import { caseFactsRouter, factsRouter } from "./modules/facts/index.js";
import { caseNotesRouter, notesRouter } from "./modules/notes/index.js";
import { tasksRouter, caseTasksRouter } from "./modules/tasks/index.js";
import { searchRouter } from "./modules/search/index.js";
import { auditRouter } from "./modules/audit/index.js";
import { forensicRouter, documentForensicRouter } from "./modules/forensic/index.js";
import { diaryRouter } from "./modules/diary/index.js";
import { sourcesRouter } from "./modules/sources/index.js";
import { storyRouter } from "./modules/story/index.js";
import { importsRouter } from "./modules/imports/index.js";
import { evidenceItemsRouter } from "./modules/evidence-items/index.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: getAllowedOrigins(), credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(requestIdMiddleware);
  app.use(httpLoggerMiddleware);

  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use(healthRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/cases", casesRouter);
  app.use("/api/v1/cases/:caseId/entities", caseEntitiesRouter);
  app.use("/api/v1/cases/:caseId/documents", caseDocumentsRouter);
  app.use("/api/v1/cases/:caseId/facts", caseFactsRouter);
  app.use("/api/v1/cases/:caseId/notes", caseNotesRouter);
  app.use("/api/v1/cases/:caseId/tasks", caseTasksRouter);
  app.use("/api/v1/cases/:caseId/forensic", forensicRouter);
  app.use("/api/v1/cases/:caseId/diary", diaryRouter);
  app.use("/api/v1/cases/:caseId/sources", sourcesRouter);
  app.use("/api/v1/cases/:caseId/story", storyRouter);
  app.use("/api/v1/cases/:caseId/imports", importsRouter);
  app.use("/api/v1/cases/:caseId/evidence-items", evidenceItemsRouter);
  app.use("/api/v1/documents", documentsRouter);
  app.use("/api/v1/documents", documentForensicRouter);
  app.use("/api/v1/facts", factsRouter);
  app.use("/api/v1/notes", notesRouter);
  app.use("/api/v1/tasks", tasksRouter);
  app.use("/api/v1/search", searchRouter);
  app.use("/api/v1/audit", auditRouter);
  app.use("/api/v1/entities", entitiesRouter);
  app.use("/api/v1", intelligenceRouter);
  app.use("/api/v1/ai", aiRouter);
  app.use("/api/v1/lookup", lookupRouter);
  app.use("/api/v1/legal", legalRouter);
  app.use("/api/v1/analytics", analyticsRouter);
  app.use("/api/v1/i18n", i18nRouter);

  app.use(errorHandler);
  return app;
}
