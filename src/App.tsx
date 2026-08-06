import { useEffect, useRef, useState } from "react";
import { Waves } from "lucide-react";
import MapView from "./components/MapView";
import ControlPanel from "./components/ControlPanel";
import ResultsPanel from "./components/ResultsPanel";
import TimeSlider from "./components/TimeSlider";
import AnomalyPanel from "./components/AnomalyPanel";
import { DEFAULT_EVENT, OBJECT_TYPES } from "./data/geo";
import {
  runDrift,
  computeCoastRisk,
  computeInterception,
  computeReverseOrigin,
  type SimulationResult,
  type SectorRisk,
  type InterceptionResult,
  type ReverseOriginResult,
  type DriftMode,
  type LatLng,
} from "./lib/simulation";
import { checkBackendHealth, simulateOnBackend, type DataSource } from "./lib/api";
import {
  adaptSimulationResult,
  adaptSectorRisks,
  adaptInterception,
  adaptReverseOrigin,
} from "./lib/adapters";
import "./App.css";

type BackendStatus = "checking" | "online" | "offline";

export default function App() {
  const [objectTypeId, setObjectTypeId] = useState("oil");
  const [areaKm2, setAreaKm2] = useState(DEFAULT_EVENT.areaKm2);
  const [event, setEvent] = useState<LatLng>({ lat: DEFAULT_EVENT.lat, lng: DEFAULT_EVENT.lng });
  const [pickingEnabled, setPickingEnabled] = useState(false);
  const [horizonHours, setHorizonHours] = useState(24);
  const [mode, setMode] = useState<DriftMode>("forward");
  const [dataMode, setDataMode] = useState<DataSource>("demo");
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");

  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [sectorRisks, setSectorRisks] = useState<SectorRisk[] | null>(null);
  const [interception, setInterception] = useState<InterceptionResult | null>(null);
  const [reverseOrigin, setReverseOrigin] = useState<ReverseOriginResult | null>(null);
  const [recommendedAction, setRecommendedAction] = useState<string | null>(null);
  const [windSource, setWindSource] = useState<"live" | "demo" | null>(null);
  const [currentSource, setCurrentSource] = useState<"live" | "demo" | null>(null);
  const [runNotice, setRunNotice] = useState<string | null>(null);
  const [anomalyPanelOpen, setAnomalyPanelOpen] = useState(false);

  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimer = useRef<number | null>(null);

  // Backend денсаулығын бастапқыда және әр 20 секунд сайын тексеру
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const ok = await checkBackendHealth();
      if (!cancelled) setBackendStatus(ok ? "online" : "offline");
    };
    check();
    const timer = window.setInterval(check, 20000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  const handlePickEvent = (p: LatLng) => {
    setEvent(p);
    setPickingEnabled(false);
  };

  const runClientSide = () => {
    const windage = OBJECT_TYPES.find((t) => t.id === objectTypeId)?.windage ?? 0.02;
    const res = runDrift({ event, areaKm2, windage, horizonHours, mode });
    setResult(res);
    setWindSource("demo");
    setCurrentSource("demo");

    if (mode === "forward") {
      const risks = computeCoastRisk(res);
      setSectorRisks(risks);
      const inter = computeInterception(res);
      setInterception(inter);
      setReverseOrigin(null);
      setRecommendedAction(null); // ResultsPanel клиент жағында өзі құрастырады
    } else {
      setSectorRisks(null);
      setInterception(null);
      setReverseOrigin(computeReverseOrigin(res, event));
      setRecommendedAction(null);
    }
    setFrameIndex(res.frames.length - 1);
    setHasRun(true);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setIsPlaying(false);
    setRunNotice(null);

    if (dataMode === "live" && backendStatus === "online") {
      try {
        const objectType = objectTypeId;
        const apiRes = await simulateOnBackend({
          event, areaKm2, objectType, horizonHours, mode, dataSource: "live", particleCount: 500,
        });
        setResult(adaptSimulationResult(apiRes));
        setSectorRisks(adaptSectorRisks(apiRes));
        setInterception(adaptInterception(apiRes));
        setReverseOrigin(adaptReverseOrigin(apiRes));
        setRecommendedAction(apiRes.recommended_action);
        setWindSource(apiRes.wind_data_source);
        setCurrentSource(apiRes.current_data_source);
        if (apiRes.wind_data_source === "demo" && apiRes.current_data_source === "demo") {
          setRunNotice(
            "Backend осы координат үшін нақты API дерегін таппады (Каспий кейбір жаһандық мұхит модельдерінде толық қамтылмаған) — синтетикалық демо өрісіне ауысты."
          );
        }
        setFrameIndex(apiRes.frames.length - 1);
        setHasRun(true);
      } catch (err) {
        console.error("Backend simulate failed, falling back to client-side demo:", err);
        setRunNotice("Backend-пен байланыс орнатылмады — клиент жағындағы Demo режиміне автоматты түрде ауыстырылды.");
        runClientSide();
      } finally {
        setIsRunning(false);
      }
      return;
    }

    // Demo режимі — толығымен клиент жағында, желіге тәуелсіз
    window.setTimeout(() => {
      runClientSide();
      setIsRunning(false);
    }, 350);
  };

  // Playback
  useEffect(() => {
    if (isPlaying && result) {
      playTimer.current = window.setInterval(() => {
        setFrameIndex((idx) => {
          if (idx >= result.frames.length - 1) return 0;
          return idx + 1;
        });
      }, 260);
    }
    return () => {
      if (playTimer.current) window.clearInterval(playTimer.current);
    };
  }, [isPlaying, result]);

  const particles = result ? result.frames[frameIndex] ?? [] : [];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark"><Waves size={20} /></div>
          <div>
            <div className="brand-title">TOLQYN AI</div>
            <div className="brand-subtitle">Caspian Drift Intelligence</div>
          </div>
        </div>
        <div className="header-tag">BluePulse · Caspian Hackathon 2026</div>
      </header>

      <main className="app-main">
        <ControlPanel
          objectTypeId={objectTypeId}
          onObjectTypeChange={setObjectTypeId}
          areaKm2={areaKm2}
          onAreaChange={setAreaKm2}
          event={event}
          pickingEnabled={pickingEnabled}
          onTogglePicking={() => setPickingEnabled((v) => !v)}
          horizonHours={horizonHours}
          onHorizonChange={setHorizonHours}
          mode={mode}
          onModeChange={(m) => { setMode(m); setHasRun(false); setResult(null); }}
          dataMode={dataMode}
          onDataModeChange={setDataMode}
          backendStatus={backendStatus}
          onRun={handleRun}
          isRunning={isRunning}
          onOpenAnomalyPanel={() => setAnomalyPanelOpen(true)}
        />

        <section className="map-section">
          <MapView
            event={event}
            onPickEvent={handlePickEvent}
            pickingEnabled={pickingEnabled}
            particles={particles}
            sectorRisks={sectorRisks}
            interception={interception}
            mode={mode}
          />
          {result && (
            <TimeSlider
              hours={result.hours}
              currentIndex={frameIndex}
              onChange={setFrameIndex}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying((v) => !v)}
              disabled={!result}
            />
          )}
          {pickingEnabled && (
            <div className="picking-banner">Оқиға нүктесін белгілеу үшін картаны басыңыз</div>
          )}
          {runNotice && (
            <div className="run-notice">{runNotice}</div>
          )}
        </section>

        <ResultsPanel
          mode={mode}
          sectorRisks={sectorRisks}
          interception={interception}
          reverseOrigin={reverseOrigin}
          hasRun={hasRun}
          recommendedAction={recommendedAction}
          windSource={windSource}
          currentSource={currentSource}
        />
      </main>

      {anomalyPanelOpen && <AnomalyPanel onClose={() => setAnomalyPanelOpen(false)} />}
    </div>
  );
}
