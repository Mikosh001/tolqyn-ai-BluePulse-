import { COAST_SECTORS } from "../data/geo";
import type {
  SimulationResult,
  SectorRisk,
  InterceptionResult,
  ReverseOriginResult,
} from "./simulation";
import type { SimulateResponseApi } from "./api";

export function adaptSimulationResult(res: SimulateResponseApi): SimulationResult {
  return {
    frames: res.frames,
    hours: res.hours,
    mode: res.mode,
  };
}

export function adaptSectorRisks(res: SimulateResponseApi): SectorRisk[] | null {
  if (!res.sector_risks) return null;
  return res.sector_risks.map((r) => {
    const sector = COAST_SECTORS.find((s) => s.id === r.sector_id) ?? {
      id: r.sector_id,
      name: r.sector_name,
      lat: 0,
      lng: 0,
      radiusKm: 15,
      kind: "city" as const,
    };
    return {
      sector,
      probability: r.probability,
      etaHour: r.eta_hour,
      riskScore: r.risk_score,
      scoreExplanation: r.score_explanation,
    };
  });
}

export function adaptInterception(res: SimulateResponseApi): InterceptionResult | null {
  if (!res.interception) return null;
  const i = res.interception;
  return {
    point: i.point,
    windowStartHour: i.window_start_hour,
    windowEndHour: i.window_end_hour,
    clusterRadiusKm: i.cluster_radius_km,
    coastSpreadRadiusKm: i.coast_spread_radius_km,
    areaRatio: i.area_ratio,
  };
}

export function adaptReverseOrigin(res: SimulateResponseApi): ReverseOriginResult | null {
  if (!res.reverse_origin) return null;
  const o = res.reverse_origin;
  return {
    center: o.center,
    radiusKm: o.radius_km,
    distanceFromFoundKm: o.distance_from_found_km,
    bearingLabel: o.bearing_label,
  };
}
