import { z } from "zod";

export const factTypeSchema = z.enum([
  "financial_amount", "date", "official_statement", "entity_mention",
  "legal_section", "process_event", "contractor_name", "project_detail",
]);

export const createFactSchema = z.object({
  factType: factTypeSchema,
  content: z.string().min(1),
  amount: z.number().optional(),
  amountCategory: z.string().optional(),
  factDate: z.string().date().optional(),
  entityName: z.string().optional(),
  legalSection: z.string().optional(),
  confidence: z.enum(["confirmed", "uncertain", "inferred"]).optional(),
});

export const updateFactSchema = createFactSchema.partial().omit({ factType: true }).extend({
  factType: factTypeSchema.optional(),
});

export type CreateFactInput = z.infer<typeof createFactSchema>;
export type UpdateFactInput = z.infer<typeof updateFactSchema>;
