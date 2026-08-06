/**
 * Backend (FastAPI) клиенті.
 *
 * Барлық функциялар қате болған жағдайда throw жасайды — шақырушы жақ
 * (App.tsx) осы қатені ұстап, клиент жағындағы Demo симуляциясына
 * (src/lib/simulation.ts) automatты түрде ауысады. Бұл backend
 * қолжетімсіз болған сәтте де қосымшаның жұмысын тоқтатпайды.
 */
import type { DriftMode, LatLng } from "./simulation";

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:8000";

export type DataSource = "demo" | "live";

export interface SectorRiskApi {
  sector_id: string;
  sector_name: string;
  probability: number;
  eta_hour: number | null;
  risk_score: number;
  score_explanation: string;
}

export interface InterceptionApi {
  point: LatLng;
  window_start_hour: number;
  window_end_hour: number;
  cluster_radius_km: number;
  coast_spread_radius_km: number;
  area_ratio: number;
}

export interface ReverseOriginApi {
  center: LatLng;
  radius_km: number;
  distance_from_found_km: number;
  bearing_label: string;
}

export interface SimulateResponseApi {
  mode: DriftMode;
  hours: number[];
  frames: LatLng[][];
  sector_risks: SectorRiskApi[] | null;
  interception: InterceptionApi | null;
  reverse_origin: ReverseOriginApi | null;
  recommended_action: string;
  wind_data_source: "live" | "demo";
  current_data_source: "live" | "demo";
}

export interface SimulateParams {
  event: LatLng;
  areaKm2: number;
  objectType: string;
  horizonHours: number;
  mode: DriftMode;
  dataSource: DataSource;
  particleCount?: number;
}

const REQUEST_TIMEOUT_MS = 9000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data?.status === "ok";
  } catch {
    return false;
  }
}

export async function simulateOnBackend(params: SimulateParams): Promise<SimulateResponseApi> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: { lat: params.event.lat, lng: params.event.lng },
      area_km2: params.areaKm2,
      object_type: params.objectType,
      horizon_hours: params.horizonHours,
      mode: params.mode,
      data_source: params.dataSource,
      particle_count: params.particleCount ?? 400,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Backend /api/simulate ${res.status}: ${text}`);
  }
  return res.json();
}

export interface AnomalyApi {
  x: number;
  y: number;
  w: number;
  h: number;
  area_px: number;
  darkness_score: number;
  smoothness_score: number;
  confidence: number;
}

export interface AnomalyDetectResponseApi {
  anomalies: AnomalyApi[];
  annotated_image_base64: string;
}

export async function detectAnomalyOnBackend(file: File): Promise<AnomalyDetectResponseApi> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/detect-anomaly`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Backend /api/detect-anomaly ${res.status}: ${text}`);
  }
  return res.json();
}
