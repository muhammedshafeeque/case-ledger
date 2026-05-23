import { describe, it, expect } from "vitest";
import { parseCdrCsv } from "./cdr.parser.js";

describe("parseCdrCsv", () => {
  it("parses caller/callee/time columns", () => {
    const csv = `caller,callee,datetime,duration
+9111111111,+9222222222,2026-01-15T10:00:00Z,120
+9333333333,+9444444444,2026-01-16T11:30:00Z,45`;
    const rows = parseCdrCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].caller).toBe("+9111111111");
    expect(rows[0].callee).toBe("+9222222222");
    expect(rows[0].durationSec).toBe(120);
  });

  it("returns empty for header-only", () => {
    expect(parseCdrCsv("caller,callee,time\n")).toEqual([]);
  });
});
