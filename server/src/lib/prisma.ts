import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaOverride: PrismaClient | undefined;
};

function createDefaultClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export function setPrismaClient(client: PrismaClient) {
  globalForPrisma.prismaOverride = client;
}

function getClient(): PrismaClient {
  return globalForPrisma.prismaOverride ?? globalForPrisma.prisma ?? createDefaultClient();
}

const client = getClient();
if (process.env.NODE_ENV !== "production" && !globalForPrisma.prismaOverride) {
  globalForPrisma.prisma = client;
}

export const prisma: PrismaClient = new Proxy(client, {
  get(_target, prop, receiver) {
    const current = getClient();
    const value = Reflect.get(current, prop, receiver);
    return typeof value === "function" ? value.bind(current) : value;
  },
});
