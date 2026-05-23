import type { LookupAdapter } from "../lookup.types.js";
import { eprocQuerySchema } from "../lookup.types.js";
import { fetchHtml } from "../lookup.http.js";
import { parseTableRows, normalizePastedArray } from "./shared.js";

const BASE = "https://etenders.kerala.gov.in";

export const eprocAdapter: LookupAdapter = {
  source: "eproc",
  preview(query) {
    const q = eprocQuerySchema.parse(query);
    const param = q.tenderId ? `tenderId=${encodeURIComponent(q.tenderId)}` : `keyword=${encodeURIComponent(q.keyword!)}`;
    return {
      url: `${BASE}/`,
      description: "Kerala e-Procurement",
      summary: q.tenderId ? `Tender ${q.tenderId}` : `Search: ${q.keyword}`,
      fieldSchema: [
        { key: "tenderId", label: "Tender ID", type: "string" },
        { key: "title", label: "Title", type: "string" },
        { key: "amount", label: "Amount", type: "number" },
        { key: "date", label: "Date", type: "date" },
      ],
    };
  },
  async fetchLive(query) {
    const q = eprocQuerySchema.parse(query);
    const url = `${BASE}/`;
    try {
      const html = await fetchHtml(url);
      const parsed = parseTableRows(html);
      if (parsed.results.length === 0) {
        return {
          results: [{
            tenderId: q.tenderId ?? null,
            keyword: q.keyword ?? null,
            note: "No table rows parsed; use paste fallback with JSON from portal",
          }],
          rawNote: "parse_empty",
        };
      }
      return {
        results: parsed.results.map((r, i) => ({
          tenderId: q.tenderId ?? `row-${i}`,
          title: String(r.col1 ?? r.summary ?? r.raw ?? ""),
          amount: r.col2,
          date: r.col3,
          ...r,
        })),
      };
    } catch (e) {
      return {
        results: [{ error: String(e), tenderId: q.tenderId, keyword: q.keyword }],
        rawNote: "fetch_failed",
      };
    }
  },
  normalizePasted: normalizePastedArray,
};
