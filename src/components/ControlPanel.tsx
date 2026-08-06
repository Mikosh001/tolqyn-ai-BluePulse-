import { Droplet, MapPin, Play, RotateCcw, Satellite, ScanSearch } from "lucide-react";
import { OBJECT_TYPES } from "../data/geo";
import type { DriftMode, LatLng } from "../lib/simulation";
import type { DataSource } from "../lib/api";

interface Props {
  objectTypeId: string;
  onObjectTypeChange: (id: string) => void;
  areaKm2: number;
  onAreaChange: (v: number) => void;
  event: LatLng;
  pickingEnabled: boolean;
  onTogglePicking: () => void;
  horizonHours: number;
  onHorizonChange: (h: number) => void;
  mode: DriftMode;
  onModeChange: (m: DriftMode) => void;
  dataMode: DataSource;
  onDataModeChange: (m: DataSource) => void;
  backendStatus: "checking" | "online" | "offline";
  onRun: () => void;
  isRunning: boolean;
  onOpenAnomalyPanel: () => void;
}

const HORIZONS = [12, 24, 48, 72];

export default function ControlPanel(props: Props) {
  const {
    objectTypeId, onObjectTypeChange, areaKm2, onAreaChange, event,
    pickingEnabled, onTogglePicking, horizonHours, onHorizonChange,
    mode, onModeChange, dataMode, onDataModeChange, backendStatus,
    onRun, isRunning, onOpenAnomalyPanel,
  } = props;

  return (
    <aside className="panel control-panel">
      <div className="panel-header">
        <Satellite size={18} />
        <span>Оқиға параметрлері</span>
      </div>

      <div className="field-group">
        <label className="field-label">
          {mode === "forward" ? "Оқиға түрі" : "Табылған объект түрі"}
        </label>
        <div className="chip-row">
          {OBJECT_TYPES.map((t) => (
            <button
              key={t.id}
              className={`chip ${objectTypeId === t.id ? "chip-active" : ""}`}
              onClick={() => onObjectTypeChange(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field-group">
        <label className="field-label">
          <MapPin size={13} /> {mode === "forward" ? "Оқиға координаты" : "Табылған координат"}
        </label>
        <div className="coord-row">
          <span>{event.lat.toFixed(4)}, {event.lng.toFixed(4)}</span>
          <button
            className={`btn-outline small ${pickingEnabled ? "btn-outline-active" : ""}`}
            onClick={onTogglePicking}
          >
            {pickingEnabled ? "Картадан таңдап жатыр…" : "Картадан таңдау"}
          </button>
        </div>
      </div>

      <div className="field-group">
        <label className="field-label">
          <Droplet size={13} /> Ауданы (шамамен, км²)
        </label>
        <input
          type="range"
          min={0.2}
          max={6}
          step={0.1}
          value={areaKm2}
          onChange={(e) => onAreaChange(parseFloat(e.target.value))}
        />
        <div className="range-value">{areaKm2.toFixed(1)} км²</div>
      </div>

      <div className="field-group">
        <label className="field-label">Болжау көкжиегі</label>
        <div className="chip-row">
          {HORIZONS.map((h) => (
            <button
              key={h}
              className={`chip ${horizonHours === h ? "chip-active" : ""}`}
              onClick={() => onHorizonChange(h)}
            >
              {h} сағ
            </button>
          ))}
        </div>
      </div>

      <div className="field-group">
        <label className="field-label">Режим</label>
        <div className="toggle-row">
          <button
            className={`toggle-btn ${mode === "forward" ? "toggle-active" : ""}`}
            onClick={() => onModeChange("forward")}
          >
            Forward Drift
          </button>
          <button
            className={`toggle-btn ${mode === "reverse" ? "toggle-active" : ""}`}
            onClick={() => onModeChange("reverse")}
          >
            <RotateCcw size={13} /> Reverse Drift
          </button>
        </div>
      </div>

      <div className="field-group">
        <label className="field-label datasource-label">
          <span>Дерек көзі</span>
          <span className={`status-dot status-${backendStatus}`} />
          <span className="status-text">
            {backendStatus === "online" && "backend қосылған"}
            {backendStatus === "offline" && "backend қолжетімсіз"}
            {backendStatus === "checking" && "тексерілуде…"}
          </span>
        </label>
        <div className="toggle-row">
          <button
            className={`toggle-btn ${dataMode === "demo" ? "toggle-active" : ""}`}
            onClick={() => onDataModeChange("demo")}
          >
            Demo Data
          </button>
          <button
            className={`toggle-btn ${dataMode === "live" ? "toggle-active" : ""} ${backendStatus !== "online" ? "toggle-disabled" : ""}`}
            onClick={() => backendStatus === "online" && onDataModeChange("live")}
            disabled={backendStatus !== "online"}
            title={
              backendStatus === "online"
                ? "Open-Meteo Forecast/Marine API арқылы нақты жел мен ағыс дерегі"
                : "Backend серверіне қосылу қажет (README-ді қараңыз)"
            }
          >
            Live Data
          </button>
        </div>
      </div>

      <button className="btn-primary run-btn" onClick={onRun} disabled={isRunning}>
        <Play size={16} />
        {isRunning ? "Есептелуде…" : "Симуляцияны бастау"}
      </button>

      <button
        className="btn-outline anomaly-btn"
        onClick={onOpenAnomalyPanel}
        disabled={backendStatus !== "online"}
        title={backendStatus === "online" ? undefined : "Backend серверіне қосылу қажет"}
      >
        <ScanSearch size={15} /> Спутник суретін талдау (AI)
      </button>
    </aside>
  );
}
