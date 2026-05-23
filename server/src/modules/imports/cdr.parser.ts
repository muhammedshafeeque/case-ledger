export type CdrRow = {
  caller: string;
  callee: string;
  occurredAt: Date;
  durationSec?: number;
};

export function parseCdrCsv(text: string): CdrRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/"/g, ""));
  const idx = (names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));

  const callerI = idx(["caller", "a_party", "from", "calling"]);
  const calleeI = idx(["callee", "b_party", "to", "called"]);
  const timeI = idx(["time", "date", "datetime", "timestamp", "start"]);
  const durI = idx(["duration", "secs", "seconds"]);

  const rows: CdrRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const caller = cols[callerI >= 0 ? callerI : 0] ?? "";
    const callee = cols[calleeI >= 0 ? calleeI : 1] ?? "";
    const timeRaw = cols[timeI >= 0 ? timeI : 2] ?? "";
    if (!caller || !callee || !timeRaw) continue;
    const occurredAt = new Date(timeRaw);
    if (Number.isNaN(occurredAt.getTime())) continue;
    rows.push({
      caller,
      callee,
      occurredAt,
      durationSec: durI >= 0 ? Number(cols[durI]) || undefined : undefined,
    });
  }
  return rows;
}
