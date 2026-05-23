import type { LookupAdapter, LookupSource } from "./lookup.types.js";
import { mca21Adapter } from "./adapters/mca21.adapter.js";
import { eprocAdapter } from "./adapters/eproc.adapter.js";
import { ecourtsAdapter } from "./adapters/ecourts.adapter.js";
import { cagAdapter } from "./adapters/cag.adapter.js";

const adapters: Record<LookupSource, LookupAdapter> = {
  mca21: mca21Adapter,
  eproc: eprocAdapter,
  ecourts: ecourtsAdapter,
  cag: cagAdapter,
};

export function getAdapter(source: LookupSource): LookupAdapter {
  return adapters[source];
}
