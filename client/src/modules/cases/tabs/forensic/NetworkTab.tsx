import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../../../api/client";
import ForceGraph2D from "react-force-graph-2d";
import { Network } from "lucide-react";

type GraphData = {
  nodes: Array<{ id: string; name: string; type: string; role?: string; riskScore?: number }>;
  edges: Array<{ from: string; to: string; relationshipType: string }>;
};

type Props = { caseId: string };

export function NetworkTab({ caseId }: Props) {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["forensic-network", caseId],
    queryFn: () => apiGet<GraphData>(`/api/v1/cases/${caseId}/forensic/network`),
  });

  const graphData = useMemo(() => {
    if (!data) return { nodes: [], links: [] };
    return {
      nodes: data.nodes.map((n) => ({
        id: n.id,
        name: n.name,
        type: n.type,
        val: 1 + (n.riskScore ?? 0) / 20,
      })),
      links: data.edges.map((e) => ({
        source: e.from,
        target: e.to,
        label: e.relationshipType,
      })),
    };
  }, [data]);

  if (isLoading) return <div className="loading">{t("common.loading")}</div>;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title"><Network size={14} /> {t("forensic.network")}</span>
        <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
          {data?.nodes.length ?? 0} nodes · {data?.edges.length ?? 0} edges
        </span>
      </div>
      {graphData.nodes.length === 0 ? (
        <p style={{ padding: "2rem", color: "#64748b" }}>{t("forensic.networkEmpty")}</p>
      ) : (
        <div style={{ height: 480, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
          <ForceGraph2D
            graphData={graphData}
            nodeLabel="name"
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = (node as { name?: string }).name ?? "";
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.fillStyle = "#334155";
              ctx.fillText(label, (node.x ?? 0) + 4, (node.y ?? 0) + 4);
            }}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkLabel={(l) => (l as { label?: string }).label ?? ""}
          />
        </div>
      )}
    </div>
  );
}
