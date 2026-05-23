import { z } from "zod";

export const apiEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});

export type ApiEnvelope<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
};

export function successResponse<T>(data: T, meta?: Record<string, unknown>): ApiEnvelope<T> {
  return { success: true, data, meta };
}

export function errorResponse(error: string, meta?: Record<string, unknown>): ApiEnvelope {
  return { success: false, error, meta };
}
