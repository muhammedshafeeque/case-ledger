import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../api/client";
import { Search } from "lucide-react";

type SearchResult = {
  cases: Array<{ id: string; rtiId: string; title: string; department: string; status: string; investigationType: string }>;
  entities: Array<{ id: string; name: string; type: string; riskScore: number }>;
  facts: Array<{ id: string; content: string; factType: string; caseId: string; case: { rtiId: string; title: string } }>;
  documents: Array<{ id: string; caseId: string; snippet: string }>;
};

export function SearchPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isFetching } = useQuery({
    queryKey: ["search", submitted],
    queryFn: () => apiGet<SearchResult>(`/api/v1/search?q=${encodeURIComponent(submitted)}&limit=20`),
    enabled: submitted.length >= 2,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length >= 2) setSubmitted(q.trim());
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("nav.search")}</h1>
          <p className="page-subtitle">{t("search.subtitle")}</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.placeholder")}
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={q.trim().length < 2}>
            <Search size={14} />
            {t("search.button")}
          </button>
        </div>
      </form>

      {isFetching && <div className="loading">{t("common.loading")}</div>}

      {data && submitted && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Section title={t("search.cases")} count={data.cases.length}>
            {data.cases.map((c) => (
              <Link key={c.id} to={`/cases/${c.id}`} className="search-hit">
                <strong>{c.rtiId}</strong> — {c.title}
                <span style={{ color: "#64748b", fontSize: "0.8125rem" }}> · {c.department}</span>
              </Link>
            ))}
          </Section>
          <Section title={t("search.entities")} count={data.entities.length}>
            {data.entities.map((e) => (
              <div key={e.id} className="search-hit">
                <strong>{e.name}</strong>
                <span className="badge pending" style={{ marginLeft: 8 }}>{e.type}</span>
                <span style={{ marginLeft: 8, fontSize: "0.8125rem" }}>risk {e.riskScore}</span>
              </div>
            ))}
          </Section>
          <Section title={t("search.facts")} count={data.facts.length}>
            {data.facts.map((f) => (
              <Link key={f.id} to={`/cases/${f.caseId}`} className="search-hit">
                {f.content.slice(0, 120)}
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>
                  {f.case.rtiId} — {f.factType}
                </span>
              </Link>
            ))}
          </Section>
          <Section title={t("search.documents")} count={data.documents?.length ?? 0}>
            {(data.documents ?? []).map((d) => (
              <Link key={d.id} to={`/cases/${d.caseId}?tab=forensic`} className="search-hit">
                {d.snippet || "—"}
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>
                  {t("search.openExaminer")}
                </span>
              </Link>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="card-header">
        <span className="card-title">{title} ({count})</span>
      </div>
      {count === 0 ? (
        <p style={{ padding: "1rem", color: "#64748b", margin: 0 }}>No matches</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
      )}
    </div>
  );
}
