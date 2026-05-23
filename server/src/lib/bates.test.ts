import { describe, it, expect } from "vitest";
import { formatExhibitNumber, inferMediaKind } from "./bates.js";

describe("bates", () => {
  it("formats exhibit numbers", () => {
    expect(formatExhibitNumber("CL-2026-00012", 3)).toBe("CL-2026-00012-EXH-003");
  });

  it("infers media kinds", () => {
    expect(inferMediaKind("image/png", "photo.png")).toBe("image");
    expect(inferMediaKind("audio/mpeg", "x.mp3")).toBe("audio");
    expect(inferMediaKind("application/pdf", "doc.pdf")).toBe("document");
  });
});
