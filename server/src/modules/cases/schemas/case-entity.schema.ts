import { z } from "zod";

export const personRoleSchema = z.enum([
  "subject",
  "witness",
  "official",
  "accused",
  "victim",
  "intermediary",
  "complainant",
  "other",
]);

export const addCasePersonSchema = z.object({
  name: z.string().min(1).optional(),
  entityId: z.string().uuid().optional(),
  role: z.string().min(1),
  designation: z.string().optional(),
  relevanceScore: z.number().int().min(0).max(100).optional(),
}).refine((d) => Boolean(d.entityId) || Boolean(d.name?.trim()), {
  message: "name or entityId is required",
});

export const updateCasePersonSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  designation: z.string().optional(),
  relevanceScore: z.number().int().min(0).max(100).optional(),
});

export type AddCasePersonInput = z.infer<typeof addCasePersonSchema>;
export type UpdateCasePersonInput = z.infer<typeof updateCasePersonSchema>;
