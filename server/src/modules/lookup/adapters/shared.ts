import * as cheerio from "cheerio";
import type { LookupFetchResult } from "../lookup.types.js";

export function parseTableRows(html: string, minCols = 2): LookupFetchResult {
  const $ = cheerio.load(html);
  const results: Record<string, unknown>[] = [];
  $("table tr").each((_, row) => {
    const cells = $(row).find("td, th").map((__, el) => $(el).text().trim()).get();
    if (cells.length >= minCols) {
      results.push({
        col0: cells[0],
        col1: cells[1],
        col2: cells[2],
        col3: cells[3],
        raw: cells.join(" | "),
      });
    }
  });
  if (results.length === 0) {
    $("li, .result, article").slice(0, 10).each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, " ");
      if (text.length > 20) results.push({ index: i, summary: text.slice(0, 500) });
    });
  }
  return { results };
}

export function normalizePastedArray(data: unknown): LookupFetchResult {
  if (Array.isArray(data)) return { results: data as Record<string, unknown>[] };
  if (data && typeof data === "object" && "results" in data) {
    const r = (data as { results: unknown }).results;
    if (Array.isArray(r)) return { results: r as Record<string, unknown>[] };
  }
  if (data && typeof data === "object") return { results: [data as Record<string, unknown>] };
  throw new Error("pastedData must be a JSON array or { results: [] }");
}
