import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "investigator", "analyst", "legal", "journalist"]);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  totpCode: z.string().length(6).optional(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: userRoleSchema.optional(),
});

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  totpEnabled: z.boolean(),
  locale: z.string(),
});

export const authTokensResponseSchema = z.object({
  accessToken: z.string(),
  user: userResponseSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
