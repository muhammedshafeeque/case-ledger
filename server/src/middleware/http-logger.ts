import morgan from "morgan";
import type { Request, Response } from "express";
import { getEnv } from "../config/env.js";
import { logger } from "../lib/logger.js";

morgan.token("request-id", (req: Request) => req.requestId ?? "-");

const devFormat = ":request-id :method :url :status :res[content-length] - :response-time ms";
const prodFormat = ":request-id :remote-addr :method :url :status :res[content-length] - :response-time ms";

function shouldSkip(req: Request, res: Response) {
  if (getEnv().NODE_ENV === "test") return true;
  const path = req.url?.split("?")[0] ?? "";
  if (path === "/health" || path === "/ready") return true;
  return false;
}

/** HTTP access logging via morgan, streamed into the app JSON logger */
export const httpLoggerMiddleware = morgan(getEnv().NODE_ENV === "production" ? prodFormat : devFormat, {
  skip: shouldSkip,
  stream: {
    write(message: string) {
      const trimmed = message.trim();
      if (!trimmed) return;
      const status = Number(trimmed.match(/\s(\d{3})\s/)?.[1] ?? 0);
      const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
      logger[level](trimmed, { type: "http" });
    },
  },
});
