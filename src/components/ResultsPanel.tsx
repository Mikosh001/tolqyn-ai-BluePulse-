import { AlertTriangle, Crosshair, ListChecks, Undo2 } from "lucide-react";
import type { SectorRisk, InterceptionResult, ReverseOriginResult, DriftMode } from "../lib/simulation";
import { forwardActionText, reverseActionText } from "../lib/actionCopilot";

interface Props {
  mode: DriftMode;
  sectorRisks: SectorRisk[] | null;
  interception: InterceptionResult | null;
  reverseOrigin: ReverseOriginResult | null;
  hasRun: boolean;
  recommendedAction?: string | null;
  windSource?: "live" | "demo" | null;
  currentSource?: "live" | "demo" | null;
}

function DataSourceBadge({ windSource, currentSource }: { windSource?: "live" | "demo" | null; currentSource?: "live" | "demo" | null }) {
  if (!windSource && !currentSource) return null;
  return (
    <div className="source-badge-row">
      {windSource && (
        <span className={`source-badge source-${windSource}`}>
          Жел: {windSource === "live" ? "Live (Open-Meteo)" : "Demo"}
        </span>
      )}
      {currentSource && (
        <span className={`source-badge source-${currentSource}`}>
          Ағыс: {currentSource === "live" ? "Live (Open-Meteo Marine)" : "Demo"}
        </span>
      )}
    </div>
  );
}

export default function ResultsPanel({
  mode, sectorRisks, interception, reverseOrigin, hasRun,
  recommendedAction, windSource, currentSource,
}: Props) {
  if (!hasRun) {
    return (
      <aside className="panel results-panel">
        <div className="panel-header">
          <ListChecks size={18} />
          <span>Нәтиже панелі</span>
        </div>
        <p className="empty-hint">
          Картадан оқиға нүктесін таңдап, «Симуляцияны бастау» батырмасын басыңыз.
        </p>
      </aside>
    );
  }

  const top = sectorRisks?.[0];
  const actionText = recommendedAction ?? (mode === "forward" ? forwardActionText(top, interception) : reverseActionText(reverseOrigin));

  return (
    <aside className="panel results-panel">
      <div className="panel-header">
        <ListChecks size={18} />
        <span>Нәтиже панелі</span>
      </div>

      <DataSourceBadge windSource={windSource} currentSource={currentSource} />

      {mode === "forward" ? (
        <>
          <div className="stat-block">
            <div className="stat-label">ЕҢ ЖОҒАРЫ ҚАУІП</div>
            <div className="stat-value">{top?.sector.name ?? "—"}</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">ЫҚТИМАЛДЫҚ</div>
            <div className="stat-value accent">{top ? Math.round(top.probability * 100) : 0}%</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">ЖАҒАЛАУҒА ЖЕТУ УАҚЫТЫ</div>
            <div className="stat-value">{top?.etaHour != null ? `~${top.etaHour} сағат` : "белгісіз"}</div>
          </div>

          <div className="sector-list">
            {sectorRisks?.map((r) => (
              <div className="sector-row" key={r.sector.id} title={r.scoreExplanation ?? undefined}>
                <span className="sector-name">{r.sector.name}</span>
                <div className="sector-bar-track">
                  <div
                    className="sector-bar-fill"
                    style={{ width: `${Math.max(4, r.probability * 100)}%` }}
                  />
                </div>
                <span className="sector-pct">{Math.round(r.probability * 100)}%</span>
              </div>
            ))}
          </div>
          {sectorRisks?.some((r) => r.riskScore != null) && (
            <p className="risk-score-hint">
              Секторды курсормен басыңыз — Risk Prediction моделінің баллды қалай есептегені көрсетіледі.
            </p>
          )}

          {interception && (
            <div className="callout">
              <div className="callout-title"><Crosshair size={14} /> Interception Point</div>
              <div className="callout-text">
                {interception.point.lat.toFixed(3)}, {interception.point.lng.toFixed(3)}
                <br />
                Уақыт терезесі: {interception.windowStartHour}–{interception.windowEndHour} сағат
                <br />
                Есептелген аудан қатынасы: ~{interception.areaRatio}× кіші
              </div>
            </div>
          )}

          <div className="callout callout-action">
            <div className="callout-title"><AlertTriangle size={14} /> Ұсынылатын әрекет</div>
            <div className="callout-text">{actionText}</div>
          </div>
        </>
      ) : (
        <>
          <div className="callout">
            <div className="callout-title"><Undo2 size={14} /> Ықтимал бастапқы аймақ</div>
            <div className="callout-text">
              {reverseOrigin
                ? `${reverseOrigin.center.lat.toFixed(3)}, ${reverseOrigin.center.lng.toFixed(3)} (~${reverseOrigin.radiusKm} км радиус)`
                : "Есептелмеді"}
            </div>
          </div>
          <div className="callout callout-action">
            <div className="callout-title"><AlertTriangle size={14} /> Ұсынылатын әрекет</div>
            <div className="callout-text">{actionText}</div>
          </div>
        </>
      )}

      <p className="disclaimer">
        MVP ашық метеорологиялық/теңіз деректерінің демо үлгісін біріктіріп, ықтималдық
        болжам көрсетеді — толық гидродинамикалық модельдің орнына жүрмейді.
      </p>
    </aside>
  );
}
