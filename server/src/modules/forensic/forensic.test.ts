import { describe, it, expect } from "vitest";

describe("forensic timeline merge", () => {
  it("sorts items newest first", () => {
    const items = [
      { timestamp: "2024-01-01T00:00:00.000Z" },
      { timestamp: "2025-06-01T00:00:00.000Z" },
      { timestamp: "2024-06-01T00:00:00.000Z" },
    ];
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    expect(items[0].timestamp).toBe("2025-06-01T00:00:00.000Z");
  });
});
