from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class EventIn(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class SimulateRequest(BaseModel):
    event: EventIn
    area_km2: float = Field(1.7, gt=0, le=200)
    object_type: str = "oil"
    horizon_hours: int = Field(24, ge=1, le=72)
    mode: Literal["forward", "reverse"] = "forward"
    data_source: Literal["demo", "live"] = "demo"
    particle_count: int = Field(800, ge=50, le=3000)


class LatLngOut(BaseModel):
    lat: float
    lng: float


class SectorRiskOut(BaseModel):
    sector_id: str
    sector_name: str
    probability: float
    eta_hour: int | None
    risk_score: float
    score_explanation: str


class InterceptionOut(BaseModel):
    point: LatLngOut
    window_start_hour: int
    window_end_hour: int
    cluster_radius_km: float
    coast_spread_radius_km: float
    area_ratio: float


class ReverseOriginOut(BaseModel):
    center: LatLngOut
    radius_km: float
    distance_from_found_km: float
    bearing_label: str


class SimulateResponse(BaseModel):
    mode: Literal["forward", "reverse"]
    hours: list[int]
    frames: list[list[LatLngOut]]
    sector_risks: list[SectorRiskOut] | None = None
    interception: InterceptionOut | None = None
    reverse_origin: ReverseOriginOut | None = None
    recommended_action: str
    wind_data_source: Literal["live", "demo"]
    current_data_source: Literal["live", "demo"]


class AnomalyOut(BaseModel):
    x: int
    y: int
    w: int
    h: int
    area_px: int
    darkness_score: float
    smoothness_score: float
    confidence: float


class AnomalyDetectResponse(BaseModel):
    anomalies: list[AnomalyOut]
    annotated_image_base64: str
    image_width: int | None = None
    image_height: int | None = None
