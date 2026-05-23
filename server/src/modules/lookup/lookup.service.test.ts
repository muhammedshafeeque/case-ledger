import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    lookupLog: {
      create: vi.fn().mockResolvedValue({ id: "log-1", caseId: "case-1", source: "eproc" }),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    rtiCase: { findUnique: vi.fn().mockResolvedValue({ id: "case-1", metadata: {} }) },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn({
      document: { create: vi.fn().mockResolvedValue({ id: "doc-1" }) },
      fact: { create: vi.fn() },
      entity: { findFirst: vi.fn(), create: vi.fn().mockResolvedValue({ id: "ent-1" }) },
      caseEntity: { upsert: vi.fn() },
      rtiCase: { update: vi.fn() },
      lookupLog: { update: vi.fn() },
    })),
  },
}));

vi.mock("../../lib/audit.js", () => ({ writeAuditLog: vi.fn() }));

vi.mock("../../config/env.js", () => ({
  getEnv: () => ({
    LOOKUP_LIVE_FETCH: false,
    LOOKUP_FETCH_TIMEOUT_MS: 5000,
    LOOKUP_USER_AGENT: "test",
  }),
}));

import { previewLookup, executeLookup, commitLookup } from "./lookup.service.js";
import { prisma } from "../../lib/prisma.js";

describe("lookup.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preview returns token and disclaimer", () => {
    const r = previewLookup("eproc", { keyword: "road" }, "550e8400-e29b-41d4-a716-446655440000", "user-1");
    expect(r.confirmationToken).toHaveLength(64);
    expect(r.disclaimer).toContain("authorizing");
    expect(r.fieldSchema.length).toBeGreaterThan(0);
  });

  it("execute with fixture mode creates log", async () => {
    const preview = previewLookup(
      "eproc",
      { keyword: "test" },
      "550e8400-e29b-41d4-a716-446655440000",
      "user-1"
    );
    const result = await executeLookup(preview.confirmationToken, "user-1");
    expect(result.logId).toBe("log-1");
    expect(result.fetchMode).toBe("fixture");
    expect(prisma.lookupLog.create).toHaveBeenCalled();
  });

  it("execute with paste consumes token and logs", async () => {
    const preview = previewLookup(
      "mca21",
      { companyName: "Acme" },
      "550e8400-e29b-41d4-a716-446655440000",
      "user-1"
    );
    const pasted = [{ companyName: "Acme Ltd", cin: "U123" }];
    const result = await executeLookup(preview.confirmationToken, "user-1", pasted);
    expect(result.fetchMode).toBe("paste");
    expect(result.logId).toBeTruthy();
  });

  it("commit writes facts via transaction", async () => {
    vi.mocked(prisma.lookupLog.findUnique).mockResolvedValue({
      id: "log-1",
      userId: "user-1",
      caseId: "550e8400-e29b-41d4-a716-446655440000",
      source: "eproc",
      decision: "pending_review",
      dataRetrieved: { results: [{ tenderId: "T1", title: "Work" }] },
      createdAt: new Date(),
    } as never);

    const r = await commitLookup("log-1", { resultIndices: [0] }, "user-1");
    expect(r.committed).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
