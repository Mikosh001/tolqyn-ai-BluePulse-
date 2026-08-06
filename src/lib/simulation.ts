import { currentVector, windVector } from "./vectorField";
import { COAST_SECTORS, type CoastSector } from "../data/geo";

export interface LatLng {
  lat: number;
  lng: number;
}

export type DriftMode = "forward" | "reverse";

export interface SimulationParams {
  event: LatLng;
  areaKm2: number;
  windage: number;
  horizonHours: number;
  mode: DriftMode;
  particleCount?: number;
  /** Оқиға басталған сағат нөмірі (демо өрісінде фазаны айқындау үшін) */
  startHour?: number;
}

export interface SimulationResult {
  /** Әр сағат сайынғы бөлшектер жиынтығы: frames[0] = басталу күйі */
  frames: LatLng[][];
  hours: number[];
  mode: DriftMode;
}

const KM_PER_DEG_LAT = 111.32;

function kmPerDegLng(lat: number) {
  return 111.32 * Math.cos((lat * Math.PI) / 180);
}

function metersToLatLngDelta(lat: number, dEastM: number, dNorthM: number) {
  const dLat = dNorthM / 1000 / KM_PER_DEG_LAT;
  const dLng = dEastM / 1000 / kmPerDegLng(lat);
  return { dLat, dLng };
}

// Box–Muller
function gaussianRandom() {
  const u1 = Math.max(Math.random(), 1e-6);
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function initParticles(center: LatLng, areaKm2: number, count: number): LatLng[] {
  const spreadKm = Math.max(0.35, Math.sqrt(areaKm2 / Math.PI));
  const particles: LatLng[] = [];
  for (let i = 0; i < count; i++) {
    const dEastM = gaussianRandom() * spreadKm * 1000;
    const dNorthM = gaussianRandom() * spreadKm * 1000;
    const { dLat, dLng } = metersToLatLngDelta(center.lat, dEastM, dNorthM);
    particles.push({ lat: center.lat + dLat, lng: center.lng + dLng });
  }
  return particles;
}

export function runDrift(params: SimulationParams): SimulationResult {
  const {
    event,
    areaKm2,
    windage,
    horizonHours,
    mode,
    particleCount = 260,
    startHour = 0,
  } = params;

  const sign = mode === "forward" ? 1 : -1;
  let particles = initParticles(event, areaKm2, particleCount);
  const frames: LatLng[][] = [particles.map((p) => ({ ...p }))];
  const hours: number[] = [0];

  const dtSeconds = 3600;
  for (let h = 1; h <= horizonHours; h++) {
    const simHour = startHour + sign * h;
    particles = particles.map((p) => {
      const cur = currentVector(p.lat, p.lng, simHour);
      const wnd = windVector(p.lat, p.lng, simHour);
      const dEastM =
        sign * (cur.u + windage * wnd.u) * dtSeconds +
        gaussianRandom() * 55; // турбуленттілік / кездейсоқ таралу
      const dNorthM =
        sign * (cur.v + windage * wnd.v) * dtSeconds +
        gaussianRandom() * 55;
      const { dLat, dLng } = metersToLatLngDelta(p.lat, dEastM, dNorthM);
      return { lat: p.lat + dLat, lng: p.lng + dLng };
    });
    frames.push(particles.map((p) => ({ ...p })));
    hours.push(h);
  }

  return { frames, hours, mode };
}

// ---------------------------------------------------------------------------
// Жағалау тәуекелі
// ---------------------------------------------------------------------------

function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface SectorRisk {
  sector: CoastSector;
  probability: number; // 0..1
  etaHour: number | null; // алғаш рет ~30% шегінен асқан сағат
  /** Backend-тегі risk_model.py түсіндірілетін баллы (тек Live режимде келеді) */
  riskScore?: number;
  scoreExplanation?: string;
}

export function computeCoastRisk(
  result: SimulationResult,
  sectors: CoastSector[] = COAST_SECTORS
): SectorRisk[] {
  return sectors
    .map((sector) => {
      let bestProbability = 0;
      let etaHour: number | null = null;
      result.frames.forEach((frame, idx) => {
        const inside = frame.filter(
          (p) => haversineKm(p, sector) <= sector.radiusKm
        ).length;
        const probability = inside / frame.length;
        if (probability > bestProbability) bestProbability = probability;
        if (etaHour === null && probability >= 0.3) etaHour = result.hours[idx];
      });
      return { sector, probability: bestProbability, etaHour };
    })
    .sort((a, b) => b.probability - a.probability);
}

// ---------------------------------------------------------------------------
// Interception Point — бөлшектер жиналған ("шашырамаған") кездегі ең тиімді
// тоқтату нүктесі: ол — бөлшектер бүрку радиусы белгілі бір шектен аспаған
// соңғы сәт (кейін тарап, ауданы ұлғаяды).
// ---------------------------------------------------------------------------

export interface InterceptionResult {
  point: LatLng;
  windowStartHour: number;
  windowEndHour: number;
  clusterRadiusKm: number;
  coastSpreadRadiusKm: number;
  areaRatio: number; // coastSpreadArea / clusterArea — "X есе кіші аудан"
}

function centroid(frame: LatLng[]): LatLng {
  const lat = frame.reduce((s, p) => s + p.lat, 0) / frame.length;
  const lng = frame.reduce((s, p) => s + p.lng, 0) / frame.length;
  return { lat, lng };
}

function spreadRadiusKm(frame: LatLng[], center: LatLng): number {
  const dists = frame.map((p) => haversineKm(p, center));
  dists.sort((a, b) => a - b);
  // 75-персентиль — шеткі бөлшектерге тым сезімтал болмау үшін
  return dists[Math.floor(dists.length * 0.75)] ?? 0;
}

export function computeInterception(
  result: SimulationResult,
  sectors: CoastSector[] = COAST_SECTORS
): InterceptionResult | null {
  if (result.mode !== "forward") return null;

  let best: { idx: number; radius: number; center: LatLng } | null = null;

  result.frames.forEach((frame, idx) => {
    if (idx === 0) return;
    const c = centroid(frame);
    const r = spreadRadiusKm(frame, c);
    const nearestCoastKm = Math.min(
      ...sectors.map((s) => haversineKm(c, s))
    );
    // Әлі жағалауға жетпеген, бірақ жинақы күйдегі соңғы кадр
    if (nearestCoastKm > 4 && r < 6) {
      best = { idx, radius: r, center: c };
    }
  });

  if (!best) return null;
  const b = best as { idx: number; radius: number; center: LatLng };

  const clusterRadius = Math.max(b.radius, 0.4);
  // Жағалауға жеткен кездегі шашырау радиусы (соңғы кадр)
  const lastFrame = result.frames[result.frames.length - 1];
  const lastCenter = centroid(lastFrame);
  const coastSpread = Math.max(spreadRadiusKm(lastFrame, lastCenter), clusterRadius + 0.5);

  const areaRatio = (coastSpread ** 2) / (clusterRadius ** 2);

  return {
    point: b.center,
    windowStartHour: Math.max(0, b.idx - 2),
    windowEndHour: b.idx + 3,
    clusterRadiusKm: Math.round(clusterRadius * 10) / 10,
    coastSpreadRadiusKm: Math.round(coastSpread * 10) / 10,
    areaRatio: Math.round(areaRatio * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// Reverse Drift — ықтимал бастапқы аймақ
// ---------------------------------------------------------------------------

export interface ReverseOriginResult {
  center: LatLng;
  radiusKm: number;
  distanceFromFoundKm: number;
  bearingLabel: string;
}

function bearingLabel(from: LatLng, to: LatLng): string {
  const dLng = to.lng - from.lng;
  const dLat = to.lat - from.lat;
  const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  const dirs = [
    "солтүстік", "солтүстік-шығыс", "шығыс", "оңтүстік-шығыс",
    "оңтүстік", "оңтүстік-батыс", "батыс", "солтүстік-батыс",
  ];
  const idx = Math.round(((angle + 360) % 360) / 45) % 8;
  return dirs[idx];
}

export function computeReverseOrigin(
  result: SimulationResult,
  found: LatLng
): ReverseOriginResult | null {
  if (result.mode !== "reverse") return null;
  const last = result.frames[result.frames.length - 1];
  const center = centroid(last);
  const radiusKm = Math.max(spreadRadiusKm(last, center), 1);
  const distanceFromFoundKm = haversineKm(found, center);
  return {
    center,
    radiusKm: Math.round(radiusKm * 10) / 10,
    distanceFromFoundKm: Math.round(distanceFromFoundKm),
    bearingLabel: bearingLabel(found, center),
  };
}
