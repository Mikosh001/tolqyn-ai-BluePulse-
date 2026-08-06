from __future__ import annotations

import numpy as np
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from . import action_copilot, anomaly_detection, drift_model, risk_model, weather_client
from .config import ALLOWED_ORIGINS, COAST_SECTORS, OBJECT_TYPE_MAP, OBJECT_TYPES
from .schemas import (
    AnomalyDetectResponse,
    AnomalyOut,
    InterceptionOut,
    LatLngOut,
    ReverseOriginOut,
    SectorRiskOut,
    SimulateRequest,
    SimulateResponse,
)
from .synthetic_field import synthetic_current, synthetic_wind

app = FastAPI(
    title="TOLQYN AI API",
    description="Caspian Environmental Drift Prediction and Response System — backend",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"http://localhost:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FRAME_PARTICLES = 300  # желіге жіберілетін бөлшек саны (payload өлшемін шектеу үшін)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "tolqyn-ai-backend"}


@app.get("/api/sectors")
def get_sectors():
    return [
        {"id": s.id, "name": s.name, "lat": s.lat, "lng": s.lng, "radius_km": s.radius_km, "kind": s.kind}
        for s in COAST_SECTORS
    ]


@app.get("/api/object-types")
def get_object_types():
    return [{"id": o.id, "label": o.label, "windage": o.windage} for o in OBJECT_TYPES]


@app.get("/api/weather")
async def get_weather(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    hours: int = Query(24, ge=1, le=72),
):
    field = await weather_client.fetch_hourly_field(lat, lng, hours)
    return {
        "hours": field.hours,
        "wind": [{"u": v.u, "v": v.v} for v in field.wind],
        "current": [{"u": v.u, "v": v.v} for v in field.current],
        "wave_height_m": field.wave_height_m,
        "wind_source": field.wind_source,
        "current_source": field.current_source,
    }


@app.post("/api/simulate", response_model=SimulateResponse)
async def simulate(req: SimulateRequest):
    obj = OBJECT_TYPE_MAP.get(req.object_type)
    if obj is None:
        raise HTTPException(400, f"Белгісіз объект түрі: {req.object_type}")

    if req.data_source == "live":
        field = await weather_client.fetch_hourly_field(req.event.lat, req.event.lng, req.horizon_hours)
        wind_by_hour = field.wind
        current_by_hour = field.current
        wind_source = field.wind_source
        current_source = field.current_source
    else:
        hours = list(range(req.horizon_hours + 1))
        wind_by_hour = [synthetic_wind(req.event.lat, req.event.lng, h) for h in hours]
        current_by_hour = [synthetic_current(req.event.lat, req.event.lng, h) for h in hours]
        wind_source = "demo"
        current_source = "demo"

    result = drift_model.run_drift(
        event_lat=req.event.lat,
        event_lng=req.event.lng,
        area_km2=req.area_km2,
        windage=obj.windage,
        horizon_hours=req.horizon_hours,
        mode=req.mode,
        wind_by_hour=wind_by_hour,
        current_by_hour=current_by_hour,
        particle_count=req.particle_count,
    )

    # --- Жіберу үшін бөлшектерді сирету (payload шектеу) ---
    n_particles = result.frames.shape[1]
    if n_particles > MAX_FRAME_PARTICLES:
        idx = np.random.default_rng(42).choice(n_particles, size=MAX_FRAME_PARTICLES, replace=False)
    else:
        idx = np.arange(n_particles)
    frames_out = [
        [LatLngOut(lat=float(p[0]), lng=float(p[1])) for p in frame[idx]] for frame in result.frames
    ]

    sector_risks_out = None
    interception_out = None
    reverse_origin_out = None
    recommended_action = ""

    if req.mode == "forward":
        sector_risks = drift_model.compute_coast_risk(result)
        scored = risk_model.score_sectors(sector_risks, req.horizon_hours)
        score_by_id = {s.sector_id: s for s in scored}

        combined = []
        for r in sector_risks:
            s = score_by_id[r.sector.id]
            combined.append(
                SectorRiskOut(
                    sector_id=r.sector.id,
                    sector_name=r.sector.name,
                    probability=r.probability,
                    eta_hour=r.eta_hour,
                    risk_score=s.score,
                    score_explanation=s.explanation,
                )
            )
        combined.sort(key=lambda c: c.risk_score, reverse=True)
        sector_risks_out = combined

        interception = drift_model.compute_interception(result)
        if interception:
            interception_out = InterceptionOut(
                point=LatLngOut(lat=interception.lat, lng=interception.lng),
                window_start_hour=interception.window_start_hour,
                window_end_hour=interception.window_end_hour,
                cluster_radius_km=interception.cluster_radius_km,
                coast_spread_radius_km=interception.coast_spread_radius_km,
                area_ratio=interception.area_ratio,
            )
        recommended_action = action_copilot.forward_action_text(
            sector_risks[0] if sector_risks else None, interception
        )
    else:
        origin = drift_model.compute_reverse_origin(result, req.event.lat, req.event.lng)
        if origin:
            reverse_origin_out = ReverseOriginOut(
                center=LatLngOut(lat=origin.lat, lng=origin.lng),
                radius_km=origin.radius_km,
                distance_from_found_km=origin.distance_from_found_km,
                bearing_label=origin.bearing_label,
            )
        recommended_action = action_copilot.reverse_action_text(origin)

    return SimulateResponse(
        mode=req.mode,
        hours=result.hours,
        frames=frames_out,
        sector_risks=sector_risks_out,
        interception=interception_out,
        reverse_origin=reverse_origin_out,
        recommended_action=recommended_action,
        wind_data_source=wind_source,
        current_data_source=current_source,
    )


@app.post("/api/detect-anomaly", response_model=AnomalyDetectResponse)
async def detect_anomaly(file: UploadFile = File(...)):
    if file.content_type not in ("image/jpeg", "image/png", "image/jpg"):
        raise HTTPException(400, "Тек JPG немесе PNG сурет қабылданады")
    content = await file.read()
    if len(content) > 12 * 1024 * 1024:
        raise HTTPException(400, "Сурет тым үлкен (12MB шегі)")
    try:
        anomalies, annotated_b64 = anomaly_detection.detect_anomalies(content)
    except ValueError as e:
        raise HTTPException(400, str(e))

    return AnomalyDetectResponse(
        anomalies=[
            AnomalyOut(
                x=a.x, y=a.y, w=a.w, h=a.h, area_px=a.area_px,
                darkness_score=a.darkness_score, smoothness_score=a.smoothness_score,
                confidence=a.confidence,
            )
            for a in anomalies
        ],
        annotated_image_base64=annotated_b64,
    )
