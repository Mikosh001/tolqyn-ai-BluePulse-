"""
Бөлшек негізіндегі дрейф симуляциясы (Lagrangian particle model).

Frontend-тегі src/lib/simulation.ts алгоритмімен бірдей физика, бірақ
numpy арқылы векторизацияланған — сервер жағында көбірек бөлшекпен
(әдепкі 800) және дәлірек есептеумен жұмыс істейді.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np

from .config import COAST_SECTORS, CoastSector
from .synthetic_field import Vector2

KM_PER_DEG_LAT = 111.32


def _km_per_deg_lng(lat: float) -> float:
    return 111.32 * math.cos(math.radians(lat))


@dataclass
class SimulationResult:
    frames: np.ndarray  # shape (T+1, N, 2) — [:, :, 0]=lat, [:, :, 1]=lng
    hours: list[int]
    mode: str


def init_particles(center_lat: float, center_lng: float, area_km2: float, count: int) -> np.ndarray:
    spread_km = max(0.35, math.sqrt(area_km2 / math.pi))
    rng = np.random.default_rng()
    d_east_m = rng.standard_normal(count) * spread_km * 1000
    d_north_m = rng.standard_normal(count) * spread_km * 1000
    d_lat = d_north_m / 1000 / KM_PER_DEG_LAT
    d_lng = d_east_m / 1000 / _km_per_deg_lng(center_lat)
    particles = np.empty((count, 2), dtype=np.float64)
    particles[:, 0] = center_lat + d_lat
    particles[:, 1] = center_lng + d_lng
    return particles


def run_drift(
    event_lat: float,
    event_lng: float,
    area_km2: float,
    windage: float,
    horizon_hours: int,
    mode: str,
    wind_by_hour: list[Vector2],
    current_by_hour: list[Vector2],
    particle_count: int = 800,
) -> SimulationResult:
    """
    wind_by_hour / current_by_hour: ұзындығы horizon_hours+1 болатын Vector2
    тізімдері (уақыт бойынша жел/ағыс өрісі, fetch_hourly_field-тен алынған).
    Кеңістіктік вариация frontend-тегідей аз мөлшерде синтетикалық шуылмен
    беріледі — нақты API нүктелік дерек қайтарғандықтан.
    """
    sign = 1.0 if mode == "forward" else -1.0
    particles = init_particles(event_lat, event_lng, area_km2, particle_count)
    frames = [particles.copy()]
    hours = [0]

    rng = np.random.default_rng()
    dt_seconds = 3600.0

    for h in range(1, horizon_hours + 1):
        idx = min(h, len(wind_by_hour) - 1)
        wind = wind_by_hour[idx]
        current = current_by_hour[idx]

        lat = particles[:, 0]
        # кеңістіктік ұсақ ауытқу — бірыңғай нүктелік дерек барлық бөлшектерге
        # бірдей әсер етпес үшін
        spatial_noise_u = np.sin(lat * 7.3 + h * 0.15) * 0.02
        spatial_noise_v = np.cos(lat * 6.1 + h * 0.12) * 0.02

        d_east_m = sign * ((current.u + windage * wind.u + spatial_noise_u) * dt_seconds) \
            + rng.standard_normal(particle_count) * 55
        d_north_m = sign * ((current.v + windage * wind.v + spatial_noise_v) * dt_seconds) \
            + rng.standard_normal(particle_count) * 55

        d_lat = d_north_m / 1000 / KM_PER_DEG_LAT
        d_lng = d_east_m / 1000 / _km_per_deg_lng(float(np.mean(lat)))

        particles = particles.copy()
        particles[:, 0] += d_lat
        particles[:, 1] += d_lng

        frames.append(particles.copy())
        hours.append(h)

    return SimulationResult(frames=np.array(frames), hours=hours, mode=mode)


# ---------------------------------------------------------------------------
# Жағалау тәуекелі
# ---------------------------------------------------------------------------

def _haversine_km(lat1, lng1, lat2, lng2) -> np.ndarray:
    R = 6371.0
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dlat = np.radians(lat2 - lat1)
    dlng = np.radians(lng2 - lng1)
    a = np.sin(dlat / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dlng / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(a))


@dataclass
class SectorRisk:
    sector: CoastSector
    probability: float
    eta_hour: int | None


def compute_coast_risk(result: SimulationResult, sectors: list[CoastSector] = COAST_SECTORS) -> list[SectorRisk]:
    risks: list[SectorRisk] = []
    for sector in sectors:
        best_p = 0.0
        eta_hour = None
        for t, frame in enumerate(result.frames):
            dists = _haversine_km(frame[:, 0], frame[:, 1], sector.lat, sector.lng)
            inside = float(np.mean(dists <= sector.radius_km))
            if inside > best_p:
                best_p = inside
            if eta_hour is None and inside >= 0.3:
                eta_hour = result.hours[t]
        risks.append(SectorRisk(sector=sector, probability=best_p, eta_hour=eta_hour))
    risks.sort(key=lambda r: r.probability, reverse=True)
    return risks


# ---------------------------------------------------------------------------
# Interception Point
# ---------------------------------------------------------------------------

@dataclass
class InterceptionResult:
    lat: float
    lng: float
    window_start_hour: int
    window_end_hour: int
    cluster_radius_km: float
    coast_spread_radius_km: float
    area_ratio: float


def _centroid(frame: np.ndarray) -> tuple[float, float]:
    return float(np.mean(frame[:, 0])), float(np.mean(frame[:, 1]))


def _spread_radius_km(frame: np.ndarray, center: tuple[float, float]) -> float:
    dists = _haversine_km(frame[:, 0], frame[:, 1], center[0], center[1])
    return float(np.percentile(dists, 75))


def compute_interception(
    result: SimulationResult, sectors: list[CoastSector] = COAST_SECTORS
) -> InterceptionResult | None:
    if result.mode != "forward":
        return None

    best = None
    for t, frame in enumerate(result.frames):
        if t == 0:
            continue
        center = _centroid(frame)
        r = _spread_radius_km(frame, center)
        nearest_coast = min(
            float(_haversine_km(np.array([center[0]]), np.array([center[1]]), s.lat, s.lng)[0])
            for s in sectors
        )
        if nearest_coast > 4 and r < 6:
            best = (t, r, center)

    if best is None:
        return None
    t, radius, center = best
    cluster_radius = max(radius, 0.4)

    last_frame = result.frames[-1]
    last_center = _centroid(last_frame)
    coast_spread = max(_spread_radius_km(last_frame, last_center), cluster_radius + 0.5)
    area_ratio = (coast_spread**2) / (cluster_radius**2)

    return InterceptionResult(
        lat=center[0],
        lng=center[1],
        window_start_hour=max(0, t - 2),
        window_end_hour=t + 3,
        cluster_radius_km=round(cluster_radius, 1),
        coast_spread_radius_km=round(coast_spread, 1),
        area_ratio=round(area_ratio, 1),
    )


# ---------------------------------------------------------------------------
# Reverse Drift — ықтимал бастапқы аймақ
# ---------------------------------------------------------------------------

@dataclass
class ReverseOriginResult:
    lat: float
    lng: float
    radius_km: float
    distance_from_found_km: float
    bearing_label: str


_DIRS = [
    "солтүстік", "солтүстік-шығыс", "шығыс", "оңтүстік-шығыс",
    "оңтүстік", "оңтүстік-батыс", "батыс", "солтүстік-батыс",
]


def _bearing_label(from_lat, from_lng, to_lat, to_lng) -> str:
    d_lng = to_lng - from_lng
    d_lat = to_lat - from_lat
    angle = math.degrees(math.atan2(d_lng, d_lat))
    idx = round(((angle + 360) % 360) / 45) % 8
    return _DIRS[idx]


def compute_reverse_origin(
    result: SimulationResult, found_lat: float, found_lng: float
) -> ReverseOriginResult | None:
    if result.mode != "reverse":
        return None
    last = result.frames[-1]
    center = _centroid(last)
    radius = max(_spread_radius_km(last, center), 1.0)
    dist = float(_haversine_km(np.array([found_lat]), np.array([found_lng]), center[0], center[1])[0])
    return ReverseOriginResult(
        lat=center[0],
        lng=center[1],
        radius_km=round(radius, 1),
        distance_from_found_km=round(dist),
        bearing_label=_bearing_label(found_lat, found_lng, center[0], center[1]),
    )
