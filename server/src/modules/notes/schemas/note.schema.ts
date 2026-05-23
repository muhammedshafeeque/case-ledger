import { z } from "zod";

export const createNoteSchema = z.object({
  body: z.string().min(1),
  isPinned: z.boolean().optional(),
});

export const updateNoteSchema = z.object({
  body: z.string().min(1).optional(),
  isPinned: z.boolean().optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
