import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { daysBetween } from "../../shared/utils/date.js";
import type { ExportProfile } from "../../lib/export-profile.js";

export function calculatePenalty(filedDate: Date) {
  const days = daysBetween(filedDate, new Date());
  const penaltyDays = Math.max(0, days - 30);
  const dailyPenalty = 250;
  const totalPenalty = Math.min(penaltyDays * dailyPenalty, 25000);
  const maxReachedDate = new Date(filedDate);
  maxReachedDate.setDate(maxReachedDate.getDate() + 30 + 100);

  return {
    daysElapsed: days,
    penaltyDays,
    dailyPenalty,
    totalPenalty,
    maxReachedDate: maxReachedDate.toISOString().slice(0, 10),
    formula: "MIN((days_elapsed - 30) × 250, 25000)",
    legalBasis: "Section 20, RTI Act 2005",
  };
}

export async function getPenalty(caseId: string) {
  const c = await prisma.rtiCase.findUnique({ where: { id: caseId } });
  if (!c) throw AppError.notFound();
  return calculatePenalty(c.filedDate);
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function generateEvidencePackageHtml(
  caseId: string,
  opts?: { full?: boolean; profile?: ExportProfile }
) {
  const profile = opts?.profile ?? (opts?.full ? "full" : "full");
  const includeCustody = profile === "full";
  const includeNotes = profile === "full";
  const publishable = profile === "publishable";

  const c = await prisma.rtiCase.findUnique({
    where: { id: caseId },
    include: {
      documents: {
        include: {
          extractions: { orderBy: { createdAt: "desc" }, take: 1 },
          custodyEvents: includeCustody
            ? { orderBy: { occurredAt: "asc" }, include: { actor: { select: { name: true } } } }
            : false,
          annotations: {
            where: publishable ? { label: "key_quote" } : undefined,
            take: 30,
          },
        },
      },
      facts: { include: { entity: { select: { name: true } } } },
      alerts: profile !== "publishable",
      caseEntities: { include: { entity: true } },
      notes: includeNotes ? { orderBy: { createdAt: "desc" }, take: 10 } : false,
      diaryEntries: includeCustody
        ? { where: { isPrivileged: false }, orderBy: { entryAt: "asc" } }
        : false,
    },
  });
  if (!c) throw AppError.notFound();

  const contradictions = await prisma.contradiction.findMany({
    where: {
      OR: [{ caseId1: caseId }, { caseId2: caseId }],
      ...(publishable ? { status: "confirmed" } : {}),
    },
  });

  const meta = c.metadata as Record<string, unknown>;
  const breakdown = meta.scoreBreakdown ?? {};

  const diarySection =
    includeCustody && "diaryEntries" in c && Array.isArray(c.diaryEntries)
      ? (c.diaryEntries as Array<{ entryAt: Date; entryType: string; summary: string }>)
          .map(
            (e) =>
              `<li>${e.entryAt.toISOString().slice(0, 16)} — ${e.entryType}: ${esc(e.summary.slice(0, 120))}</li>`
          )
          .join("")
      : "";

  const custodySection = includeCustody
    ? c.documents
        .map(
          (d) => `
<h3>${esc(d.docType)} — ${esc(d.originalFilename ?? d.id.slice(0, 8))}</h3>
<p>SHA-256: <code>${d.sha256Hash ?? "n/a"}</code> · Processing: ${d.processingStatus}</p>
<ol>${d.custodyEvents
  .map(
    (e) =>
      `<li>${e.occurredAt.toISOString()} — ${e.eventType}${
        "actor" in e && e.actor ? ` (${esc((e.actor as { name: string }).name)})` : ""
      }</li>`
  )
  .join("")}</ol>`
        )
        .join("")
    : "";

  const annotationQuotes = includeCustody || publishable
    ? c.documents
        .flatMap((d) =>
          d.annotations.map(
            (a) => `<li>[${a.label}] ${esc(a.quote.slice(0, 120))}… (doc ${d.docType})</li>`
          )
        )
        .join("")
    : "";

  const timelineFacts = c.facts
    .filter((f) => f.factDate)
    .sort((a, b) => (a.factDate!.getTime() - b.factDate!.getTime()))
    .map(
      (f) =>
        `<li>${f.factDate!.toISOString().slice(0, 10)}: ${esc(f.content.slice(0, 100))}${f.amount ? ` — ₹${f.amount}` : ""}</li>`
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Evidence Package ${esc(c.rtiId)}</title>
<style>
body{font-family:Georgia,serif;max-width:900px;margin:2em auto;line-height:1.5}
h1{border-bottom:2px solid #333}
table{border-collapse:collapse;width:100%;margin:1em 0}
th,td{border:1px solid #ccc;padding:6px;text-align:left}
@media print{body{margin:1cm}}
</style></head>
<body>
<h1>Case Ledger — Evidence Package</h1>
<p><strong>Case:</strong> ${esc(c.rtiId)} — ${esc(c.title)}</p>
<p><strong>Type:</strong> ${c.investigationType} · <strong>Department:</strong> ${esc(c.department)}</p>
<p><strong>Risk score:</strong> ${c.corruptionScore}/100</p>
${includeCustody ? `<h2>Score breakdown</h2><pre>${esc(JSON.stringify(breakdown, null, 2))}</pre>` : ""}
<h2>Case timeline</h2>
<ul>
<li>Opened: ${c.filedDate.toISOString().slice(0, 10)}</li>
<li>Due: ${c.dueDate.toISOString().slice(0, 10)}</li>
${timelineFacts}
</ul>
<h2>Persons (${c.caseEntities.length})</h2>
<table><tr><th>Name</th><th>Role</th><th>Type</th></tr>
${c.caseEntities.map((ce) => `<tr><td>${publishable ? esc(ce.role) : esc(ce.entity.name)}</td><td>${esc(ce.role)}</td><td>${ce.entity.type}</td></tr>`).join("")}
</table>
<h2>Documents (${c.documents.length})</h2>
<ul>${c.documents
  .map((d) => {
    const ext = d.extractions[0];
    const label = d.exhibitNumber ? `${d.exhibitNumber}: ` : "";
    return `<li>${label}${d.docType}: ${esc(d.originalFilename ?? d.s3Key ?? "text-only")} — hash ${d.sha256Hash?.slice(0, 16) ?? "n/a"}… · extraction ${ext?.status ?? "n/a"}</li>`;
  })
  .join("")}</ul>
${custodySection ? `<h2>Chain of custody</h2>${custodySection}` : ""}
${annotationQuotes ? `<h2>Annotation highlights</h2><ul>${annotationQuotes}</ul>` : ""}
<h2>Contradictions (${contradictions.length})</h2>
<ul>${contradictions.map((x) => `<li>[${x.status}] ${esc(x.description)}</li>`).join("")}</ul>
${diarySection ? `<h2>Case diary</h2><ul>${diarySection}</ul>` : ""}
${includeNotes && c.notes ? `<h2>Notes</h2><ul>${c.notes.map((n) => `<li>${n.createdAt.toISOString().slice(0, 10)}: ${esc(n.body.slice(0, 150))}</li>`).join("")}</ul>` : ""}
${c.alerts?.length ? `<h2>Alerts</h2><ul>${c.alerts.map((a) => `<li>[${a.severity}] ${esc(a.title)}</li>`).join("")}</ul>` : ""}
<p><strong>Export profile:</strong> ${profile}</p>
<p><em>Generated ${new Date().toISOString()} by Case Ledger. Court-ready export; verify hashes independently.</em></p>
</body></html>`;
}
