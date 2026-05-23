import type { LookupAdapter } from "../lookup.types.js";
import { mca21QuerySchema } from "../lookup.types.js";
import { fetchHtml } from "../lookup.http.js";
import { normalizePastedArray } from "./shared.js";

const MCA_URL = "https://www.mca.gov.in/mcafoportal/";

export const mca21Adapter: LookupAdapter = {
  source: "mca21",
  preview(query) {
    const q = mca21QuerySchema.parse(query);
    return {
      url: MCA_URL,
      description: "MCA21 company registry",
      summary: q.cin ? `CIN: ${q.cin}` : `Company: ${q.companyName}`,
      fieldSchema: [
        { key: "cin", label: "CIN", type: "string" },
        { key: "companyName", label: "Company Name", type: "string" },
        { key: "status", label: "Status", type: "string" },
        { key: "incorporationDate", label: "Incorporation Date", type: "date" },
      ],
    };
  },
  async fetchLive(query) {
    const q = mca21QuerySchema.parse(query);
    try {
      await fetchHtml(MCA_URL);
      return {
        results: [{
          cin: q.cin ?? null,
          companyName: q.companyName ?? null,
          status: "requires_manual_paste",
          note: "MCA21 often requires captcha; paste JSON from MCA portal after search",
        }],
        rawNote: "mca_captcha_likely",
      };
    } catch (e) {
      return {
        results: [{ cin: q.cin, companyName: q.companyName, error: String(e) }],
        rawNote: "fetch_failed",
      };
    }
  },
  normalizePasted: normalizePastedArray,
};
