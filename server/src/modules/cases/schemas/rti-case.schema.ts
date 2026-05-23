import { z } from "zod";

export const caseStatusSchema = z.enum([
  "draft", "submitted", "pending", "partial_response", "full_response", "rejected",
  "first_appeal_filed", "first_appeal_pending", "second_appeal_filed", "sic_pending",
  "sic_order_received", "court_pending", "closed_success", "closed_failure", "archived",
]);

export const casePrioritySchema = z.enum(["critical", "high", "medium", "low"]);

export const investigationTypeSchema = z.enum([
  "rti", "audit", "procurement", "whistleblower", "general",
  "criminal", "missing_persons", "financial_crime", "cyber", "internal_affairs",
]);

export const createRtiCaseSchema = z.object({
  investigationType: investigationTypeSchema.optional(),
  title: z.string().min(1),
  department: z.string().min(1).optional(),
  pioOfficer: z.string().optional(),
  priority: casePrioritySchema.optional(),
  filedDate: z.string().date(),
  tags: z.array(z.string()).optional(),
  isSensitive: z.boolean().optional(),
  crimeNumber: z.string().optional(),
  firNumber: z.string().optional(),
  station: z.string().optional(),
  courtCaseNumber: z.string().optional(),
  jurisdiction: z.string().optional(),
});

export const updateRtiCaseSchema = createRtiCaseSchema.partial().extend({
  investigationType: investigationTypeSchema.optional(),
  status: caseStatusSchema.optional(),
  responseDate: z.string().date().optional(),
  corruptionScore: z.number().int().min(0).max(100).optional(),
  isPublic: z.boolean().optional(),
});

export const rtiCaseResponseSchema = z.object({
  id: z.string().uuid(),
  rtiId: z.string(),
  title: z.string(),
  department: z.string(),
  pioOfficer: z.string().nullable(),
  status: caseStatusSchema,
  priority: casePrioritySchema,
  filedDate: z.string(),
  dueDate: z.string(),
  responseDate: z.string().nullable(),
  tags: z.array(z.string()),
  corruptionScore: z.number(),
  isPublic: z.boolean(),
  isSensitive: z.boolean(),
  metadata: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const linkCasesSchema = z.object({
  toCaseId: z.string().uuid(),
  linkType: z.string().min(1),
  strength: z.number().int().min(0).max(100).optional(),
  notes: z.string().optional(),
});

export type CreateRtiCaseInput = z.infer<typeof createRtiCaseSchema>;
export type UpdateRtiCaseInput = z.infer<typeof updateRtiCaseSchema>;
