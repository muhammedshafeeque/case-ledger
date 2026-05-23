import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { join } from "path";

let pglite: PGlite | null = null;
let prismaClient: PrismaClient | null = null;

export async function initPglitePrisma(): Promise<PrismaClient> {
  if (prismaClient) return prismaClient;

  const dataDir = join(process.cwd(), ".pglite");
  pglite = new PGlite(dataDir);
  const adapter = new PrismaPGlite(pglite);
  prismaClient = new PrismaClient({ adapter });
  return prismaClient;
}

export function getPglitePrisma(): PrismaClient {
  if (!prismaClient) {
    throw new Error("PGlite Prisma not initialized. Call initPglitePrisma() first.");
  }
  return prismaClient;
}
