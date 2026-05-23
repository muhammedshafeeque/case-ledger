import { PrismaClient as ReferencePrismaClient } from "../generated/reference-client/index.js";

const globalRef = globalThis as unknown as { referencePrisma: ReferencePrismaClient | undefined };

export const referencePrisma =
  globalRef.referencePrisma ?? new ReferencePrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalRef.referencePrisma = referencePrisma;
}
