import type { LookupAdapter } from "../lookup.types.js";
import { ecourtsQuerySchema } from "../lookup.types.js";
import { fetchHtml } from "../lookup.http.js";
import { parseTableRows, normalizePastedArray } from "./shared.js";

export const ecourtsAdapter: LookupAdapter = {
  source: "ecourts",
  preview(query) {
    const q = ecourtsQuerySchema.parse(query);
    return {
      url: "https://ecourts.gov.in/",
      description: "E-Courts India",
      summary: `Case number: ${q.caseNumber}`,
      fieldSchema: [
        { key: "caseNumber", label: "Case Number", type: "string" },
        { key: "status", label: "Status", type: "string" },
        { key: "court", label: "Court", type: "string" },
        { key: "nextHearing", label: "Next Hearing", type: "date" },
      ],
    };
  },
  async fetchLive(query) {
    const q = ecourtsQuerySchema.parse(query);
    try {
      const html = await fetchHtml("https://ecourts.gov.in/");
      const parsed = parseTableRows(html);
      if (parsed.results.length > 0) {
        return {
          results: parsed.results.slice(0, 5).map((r) => ({
            caseNumber: q.caseNumber,
            status: r.col1 ?? "unknown",
            court: r.col0,
            nextHearing: r.col2,
            ...r,
          })),
        };
      }
      return {
        results: [{
          caseNumber: q.caseNumber,
          status: "lookup_requires_paste",
          note: "Paste case status JSON from eCourts portal after manual search",
        }],
        rawNote: "parse_empty",
      };
    } catch (e) {
      return {
        results: [{ caseNumber: q.caseNumber, error: String(e) }],
        rawNote: "fetch_failed",
      };
    }
  },
  normalizePasted: normalizePastedArray,
};
