import { describe, it, expect } from "vitest";
import { calculatePenalty } from "../modules/legal/legal.service.js";

describe("RULE-02 penalty", () => {
  it("calculates zero before 30 days", () => {
    const filed = new Date();
    filed.setDate(filed.getDate() - 20);
    const result = calculatePenalty(filed);
    expect(result.penaltyDays).toBe(0);
    expect(result.totalPenalty).toBe(0);
  });

  it("caps at 25000", () => {
    const filed = new Date();
    filed.setDate(filed.getDate() - 200);
    const result = calculatePenalty(filed);
    expect(result.totalPenalty).toBe(25000);
  });
});
