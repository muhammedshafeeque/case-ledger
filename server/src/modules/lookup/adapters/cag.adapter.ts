import type { LookupAdapter } from "../lookup.types.js";
import { cagQuerySchema } from "../lookup.types.js";
import { fetchHtml } from "../lookup.http.js";
import { parseTableRows, normalizePastedArray } from "./shared.js";

export const cagAdapter: LookupAdapter = {
  source: "cag",
  preview(query) {
    const q = cagQuerySchema.parse(query);
    return {
      url: "https://cag.gov.in/",
      description: "Comptroller and Auditor General of India",
      summary: q.reportYear ? `Reports for ${q.reportYear}` : q.keyword ? `Search: ${q.keyword}` : "CAG reports index",
      fieldSchema: [
        { key: "title", label: "Report Title", type: "string" },
        { key: "year", label: "Year", type: "number" },
        { key: "department", label: "Department", type: "string" },
      ],
    };
  },
  async fetchLive(query) {
    const q = cagQuerySchema.parse(query);
    try {
      const html = await fetchHtml("https://cag.gov.in/");
      const parsed = parseTableRows(html);
      return {
        results: (parsed.results.length ? parsed.results : [{ title: "CAG portal", year: q.reportYear, keyword: q.keyword }])
          .slice(0, 10)
          .map((r) => ({
            title: String(r.col0 ?? r.summary ?? "Report"),
            year: q.reportYear ?? r.col1,
            department: r.col2,
            ...r,
          })),
      };
    } catch (e) {
      return {
        results: [{ year: q.reportYear, keyword: q.keyword, error: String(e) }],
        rawNote: "fetch_failed",
      };
    }
  },
  normalizePasted: normalizePastedArray,
};
