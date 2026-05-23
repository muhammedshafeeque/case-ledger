import { createHash, randomBytes } from "crypto";
import type { PendingLookup } from "./lookup.types.js";

const TTL_MS = 300_000;
const store = new Map<string, PendingLookup>();

export function issueToken(pending: Omit<PendingLookup, "expiresAt">): string {
  const token = createHash("sha256").update(randomBytes(16)).digest("hex");
  store.set(token, { ...pending, expiresAt: Date.now() + TTL_MS });
  return token;
}

export function getToken(token: string): PendingLookup | null {
  const entry = store.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(token);
    return null;
  }
  return entry;
}

export function consumeToken(token: string): PendingLookup | null {
  const entry = getToken(token);
  if (!entry) return null;
  store.delete(token);
  return entry;
}

export function purgeExpired() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (now > v.expiresAt) store.delete(k);
  }
}
