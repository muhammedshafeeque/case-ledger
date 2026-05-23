import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../../../api/client";
import { MapPin } from "lucide-react";

type TimelineItem = {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  meta?: { latitude?: number; longitude?: number };
};

type Props = { caseId: string };

export function MapTab({ caseId }: Props) {
  const { t } = useTranslation();

  const { data: timeline = [] } = useQuery({
    queryKey: ["forensic-timeline", caseId],
    queryFn: () => apiGet<TimelineItem[]>(`/api/v1/cases/${caseId}/forensic/timeline`),
  });

  const { data: diary = [] } = useQuery({
    queryKey: ["diary", caseId],
    queryFn: () =>
      apiGet<Array<{ id: string; summary: string; location: string | null; latitude: number | null; longitude: number | null }>>(
        `/api/v1/cases/${caseId}/diary`
      ),
  });

  const pins = useMemo(() => {
    const list: Array<{ lat: number; lng: number; label: string }> = [];
    for (const d of diary) {
      if (d.latitude != null && d.longitude != null) {
        list.push({ lat: d.latitude, lng: d.longitude, label: d.summary.slice(0, 40) });
      }
    }
    return list;
  }, [diary]);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title"><MapPin size={14} /> {t("forensic.map")}</span>
        <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>{pins.length} pins</span>
      </div>
      {pins.length === 0 ? (
        <p style={{ padding: "1rem", color: "#64748b" }}>
          {t("forensic.mapEmpty")} — {t("diary.location")} with lat/lng on diary entries.
        </p>
      ) : (
        <div style={{ padding: "1rem" }}>
          <ul>
            {pins.map((p, i) => (
              <li key={i}>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=15/${p.lat}/${p.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {p.label} ({p.lat.toFixed(4)}, {p.lng.toFixed(4)})
                </a>
              </li>
            ))}
          </ul>
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "1rem" }}>
            Timeline events: {timeline.length}. Install leaflet bundle for embedded map in a future polish.
          </p>
        </div>
      )}
    </div>
  );
}
