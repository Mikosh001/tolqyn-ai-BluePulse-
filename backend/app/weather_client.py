"""
Нақты (Live) жел және ағыс деректерін алу.

Дерек көздері (тегін, API кілті қажет емес):
  * Open-Meteo Forecast API  — жел (wind_speed_10m, wind_direction_10m)
    https://open-meteo.com/en/docs
  * Open-Meteo Marine API    — теңіз ағысы мен толқын (ocean_current_velocity,
    ocean_current_direction, wave_height)
    https://open-meteo.com/en/docs/marine-weather-api

МАҢЫЗДЫ ЕСКЕРТУ: Каспий теңізі — жабық су айдыны, әлемдік мұхитпен
байланыспайды. Marine API негізінде жатқан жаһандық мұхит модельдері
(мыс. NOAA/ECMWF wave models) Каспийді әрдайым толық қамтымауы мүмкін.
Сол себепті бұл модуль әр сұраныстан кейін деректің шынымен қайтарылғанын
тексереді (`None`/барлығы 0 емес пе) және сәтсіз болған жағдайда
`synthetic_field` модуліндегі демо моделіне automatты түрде ауысады.
Жауапта әрдайым `source: "live" | "demo"` көрсетіледі — интерфейс еш уақытта
"өтірік" Live деп белгіленген демо деректі көрсетпейді.
"""
from __future__ import annotations

import math
import time
from dataclasses import dataclass

import httpx

from .synthetic_field import Vector2, synthetic_current, synthetic_wind

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"

_CACHE_TTL_SECONDS = 15 * 60
_cache: dict[str, tuple[float, "HourlyField"]] = {}


@dataclass
class HourlyField:
    hours: list[int]
    wind: list[Vector2]
    current: list[Vector2]
    wave_height_m: list[float | None]
    wind_source: str  # "live" | "demo"
    current_source: str  # "live" | "demo"


def _cache_key(lat: float, lng: float, horizon: int) -> str:
    return f"{round(lat, 2)}:{round(lng, 2)}:{horizon}"


def _wind_vector_from_met(speed_ms: float, direction_from_deg: float) -> Vector2:
    """Метеорологиялық конвенция: бағыт желдің СОҚҚАН жағы.
    Вектор желдің соғатын бағытына қарай есептеледі (нүктеге қарай емес)."""
    theta = math.radians(direction_from_deg)
    return Vector2(u=-speed_ms * math.sin(theta), v=-speed_ms * math.cos(theta))


def _current_vector_from_marine(speed_ms: float, direction_towards_deg: float) -> Vector2:
    """Океанографиялық конвенция: бағыт ағыстың АҒАТЫН жағы (towards)."""
    theta = math.radians(direction_towards_deg)
    return Vector2(u=speed_ms * math.sin(theta), v=speed_ms * math.cos(theta))


async def fetch_hourly_field(lat: float, lng: float, horizon_hours: int) -> HourlyField:
    """Берілген нүкте үшін сағаттық жел/ағыс өрісін қайтарады.

    Мүмкіндігінше нақты (live) API дерегін пайдаланады; API қолжетімсіз
    болса немесе мән қайтармаса — сол компонент үшін синтетикалық демо
    моделіне ауысады (жел мен ағыс бір-бірінен тәуелсіз fallback жасайды).
    """
    key = _cache_key(lat, lng, horizon_hours)
    cached = _cache.get(key)
    if cached and (time.time() - cached[0]) < _CACHE_TTL_SECONDS:
        return cached[1]

    hours = list(range(horizon_hours + 1))
    forecast_days = max(1, min(3, (horizon_hours // 24) + 1))

    wind_vectors: list[Vector2] | None = None
    current_vectors: list[Vector2] | None = None
    wave_heights: list[float | None] = [None] * len(hours)
    wind_source = "demo"
    current_source = "demo"

    async with httpx.AsyncClient(timeout=6.0) as client:
        # ---- Жел (Open-Meteo Forecast API) ----
        try:
            resp = await client.get(
                FORECAST_URL,
                params={
                    "latitude": lat,
                    "longitude": lng,
                    "hourly": "wind_speed_10m,wind_direction_10m",
                    "wind_speed_unit": "ms",
                    "forecast_days": forecast_days,
                },
            )
            resp.raise_for_status()
            data = resp.json().get("hourly", {})
            speeds = data.get("wind_speed_10m") or []
            dirs = data.get("wind_direction_10m") or []
            if speeds and dirs and len(speeds) >= len(hours):
                wind_vectors = [
                    _wind_vector_from_met(speeds[h], dirs[h]) for h in hours
                ]
                wind_source = "live"
        except (httpx.HTTPError, ValueError, IndexError):
            wind_vectors = None

        # ---- Ағыс пен толқын (Open-Meteo Marine API) ----
        try:
            resp = await client.get(
                MARINE_URL,
                params={
                    "latitude": lat,
                    "longitude": lng,
                    "hourly": "wave_height,ocean_current_velocity,ocean_current_direction",
                    "forecast_days": forecast_days,
                },
            )
            resp.raise_for_status()
            data = resp.json().get("hourly", {})
            speeds = data.get("ocean_current_velocity") or []
            dirs = data.get("ocean_current_direction") or []
            waves = data.get("wave_height") or []
            has_signal = (
                speeds
                and dirs
                and len(speeds) >= len(hours)
                and any(s not in (None, 0) for s in speeds[: len(hours)])
            )
            if has_signal:
                # ocean_current_velocity Open-Meteo-да км/сағ бойынша қайтарылады
                current_vectors = [
                    _current_vector_from_marine((speeds[h] or 0) / 3.6, dirs[h] or 0)
                    for h in hours
                ]
                current_source = "live"
            if waves and len(waves) >= len(hours):
                wave_heights = [waves[h] for h in hours]
        except (httpx.HTTPError, ValueError, IndexError):
            current_vectors = None

    if wind_vectors is None:
        wind_vectors = [synthetic_wind(lat, lng, h) for h in hours]
        wind_source = "demo"
    if current_vectors is None:
        current_vectors = [synthetic_current(lat, lng, h) for h in hours]
        current_source = "demo"

    field = HourlyField(
        hours=hours,
        wind=wind_vectors,
        current=current_vectors,
        wave_height_m=wave_heights,
        wind_source=wind_source,
        current_source=current_source,
    )
    _cache[key] = (time.time(), field)
    return field
