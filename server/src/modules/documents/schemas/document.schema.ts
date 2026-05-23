import { z } from "zod";

export const documentTypeSchema = z.enum([
  "application", "response", "first_appeal", "second_appeal", "sic_order",
  "court_order", "audit_report", "news", "evidence", "tip",
]);

export const commitDocumentSchema = z.object({
  caseId: z.string().uuid(),
  docType: documentTypeSchema,
  s3Key: z.string().optional(),
  sha256Hash: z.string().length(64).optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  originalFilename: z.string().optional(),
  textContent: z.string().optional(),
  notAnswered: z.string().optional(),
  language: z.enum(["en", "ml"]).default("en"),
  facts: z.array(z.object({
    factType: z.enum([
      "financial_amount", "date", "official_statement", "entity_mention",
      "legal_section", "process_event", "contractor_name", "project_detail",
    ]),
    content: z.string(),
    amount: z.number().optional(),
    amountCategory: z.string().optional(),
    factDate: z.string().date().optional(),
    entityName: z.string().optional(),
    legalSection: z.string().optional(),
  })).optional(),
  entityMentions: z.array(z.object({
    name: z.string(),
    type: z.enum(["person", "govt_org", "company", "dept", "contractor"]),
    role: z.string(),
  })).optional(),
});

export type CommitDocumentInput = z.infer<typeof commitDocumentSchema>;
