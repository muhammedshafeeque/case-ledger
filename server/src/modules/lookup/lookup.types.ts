import { z } from "zod";

export const lookupSourceSchema = z.enum(["mca21", "eproc", "ecourts", "cag"]);
export type LookupSource = z.infer<typeof lookupSourceSchema>;

export const mca21QuerySchema = z.object({
  cin: z.string().optional(),
  companyName: z.string().optional(),
}).refine((q) => q.cin || q.companyName, { message: "cin or companyName required" });

export const eprocQuerySchema = z.object({
  tenderId: z.string().optional(),
  keyword: z.string().optional(),
}).refine((q) => q.tenderId || q.keyword, { message: "tenderId or keyword required" });

export const ecourtsQuerySchema = z.object({
  caseNumber: z.string().min(1),
});

export const cagQuerySchema = z.object({
  reportYear: z.coerce.number().int().min(2000).max(2100).optional(),
  keyword: z.string().optional(),
});

export const lookupQueryBySource: Record<LookupSource, z.ZodType<Record<string, unknown>>> = {
  mca21: mca21QuerySchema,
  eproc: eprocQuerySchema,
  ecourts: ecourtsQuerySchema,
  cag: cagQuerySchema,
};

export type FieldSchemaItem = {
  key: string;
  label: string;
  type: "string" | "number" | "date";
};

export type LookupPreview = {
  url: string;
  description: string;
  summary: string;
  fieldSchema: FieldSchemaItem[];
};

export type LookupFetchResult = {
  results: Record<string, unknown>[];
  rawNote?: string;
};

export type LookupAdapter = {
  source: LookupSource;
  preview: (query: Record<string, unknown>) => LookupPreview;
  fetchLive: (query: Record<string, unknown>) => Promise<LookupFetchResult>;
  normalizePasted: (data: unknown) => LookupFetchResult;
};

export type PendingLookup = {
  source: LookupSource;
  url: string;
  query: Record<string, unknown>;
  caseId: string;
  userId: string;
  expiresAt: number;
};

export const commitSelectedFieldsSchema = z.object({
  facts: z.array(z.object({
    factType: z.enum([
      "financial_amount", "date", "official_statement", "entity_mention",
      "legal_section", "process_event", "contractor_name", "project_detail",
    ]),
    content: z.string(),
    amount: z.number().optional(),
    amountCategory: z.string().optional(),
    factDate: z.string().optional(),
    legalSection: z.string().optional(),
  })).optional(),
  entities: z.array(z.object({
    name: z.string(),
    type: z.enum(["person", "govt_org", "company", "dept", "contractor"]),
    role: z.string().default("mentioned"),
  })).optional(),
  caseMetadata: z.record(z.unknown()).optional(),
  resultIndices: z.array(z.number()).optional(),
});
