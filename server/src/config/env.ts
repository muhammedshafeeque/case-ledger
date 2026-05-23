import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  REFERENCE_DATABASE_URL: z.string().default("file:./reference/rti-reference.db"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default("1h"),
  JWT_REFRESH_EXPIRY: z.string().default("1h"),
  ENCRYPTION_KEY: z.string().min(32),
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  TOTP_ISSUER: z.string().default("Case Ledger"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default("us-east-1"),
  /** MinIO / local S3 — e.g. http://localhost:9000 */
  S3_ENDPOINT: z.string().url().optional(),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  S3_BACKUP_BUCKET: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GROQ_API_BASE: z.string().default("https://api.groq.com/openai/v1"),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_FROM: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  LOOKUP_LIVE_FETCH: z.coerce.boolean().default(true),
  LOOKUP_FETCH_TIMEOUT_MS: z.coerce.number().default(15000),
  LOOKUP_USER_AGENT: z.string().default("CaseLedger/1.0 (investigation tool)"),
  FORENSIC_OCR_ENABLED: z.coerce.boolean().default(false),
  FORENSIC_OCR_API_KEY: z.string().optional(),
  FORENSIC_OCR_API_URL: z.string().url().optional(),
  FORENSIC_MAX_FILE_MB: z.coerce.number().default(50),
  FORENSIC_TESSERACT_LANG: z.string().default("eng"),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      console.error("Invalid environment:", parsed.error.flatten());
      throw new Error("Environment validation failed");
    }
    cached = parsed.data;
  }
  return cached;
}

export function getAllowedOrigins(): string[] {
  return getEnv().ALLOWED_ORIGINS.split(",").map((o) => o.trim());
}
