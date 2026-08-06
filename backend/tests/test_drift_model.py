import numpy as np
import pytest

from app.config import COAST_SECTORS
from app.drift_model import (
    compute_coast_risk,
    compute_interception,
    compute_reverse_origin,
    run_drift,
)
from app.synthetic_field import synthetic_current, synthetic_wind


def _demo_fields(lat, lng, horizon):
    hours = list(range(horizon + 1))
    wind = [synthetic_wind(lat, lng, h) for h in hours]
    current = [synthetic_current(lat, lng, h) for h in hours]
    return wind, current


def test_run_drift_forward_shape():
    lat, lng, horizon = 44.02, 50.62, 24
    wind, current = _demo_fields(lat, lng, horizon)
    result = run_drift(
        event_lat=lat, event_lng=lng, area_km2=1.7, windage=0.03,
        horizon_hours=horizon, mode="forward",
        wind_by_hour=wind, current_by_hour=current, particle_count=120,
    )
    assert result.frames.shape == (horizon + 1, 120, 2)
    assert result.hours == list(range(horizon + 1))
    assert result.mode == "forward"
    # Бөлшектер бастапқы нүктенің айналасында басталуы тиіс
    assert abs(float(np.mean(result.frames[0, :, 0])) - lat) < 0.05
    assert abs(float(np.mean(result.frames[0, :, 1])) - lng) < 0.05


def test_particles_actually_move():
    lat, lng, horizon = 44.02, 50.62, 24
    wind, current = _demo_fields(lat, lng, horizon)
    result = run_drift(
        event_lat=lat, event_lng=lng, area_km2=1.7, windage=0.03,
        horizon_hours=horizon, mode="forward",
        wind_by_hour=wind, current_by_hour=current, particle_count=120,
    )
    start_centroid = result.frames[0].mean(axis=0)
    end_centroid = result.frames[-1].mean(axis=0)
    moved = np.linalg.norm(end_centroid - start_centroid)
    assert moved > 0.001  # градуспен — байқалатын жылжу болуы тиіс


def test_forward_vs_reverse_move_opposite_directions():
    lat, lng, horizon = 44.02, 50.62, 12
    wind, current = _demo_fields(lat, lng, horizon)
    fwd = run_drift(
        event_lat=lat, event_lng=lng, area_km2=1.7, windage=0.03,
        horizon_hours=horizon, mode="forward",
        wind_by_hour=wind, current_by_hour=current, particle_count=200,
    )
    rev = run_drift(
        event_lat=lat, event_lng=lng, area_km2=1.7, windage=0.03,
        horizon_hours=horizon, mode="reverse",
        wind_by_hour=wind, current_by_hour=current, particle_count=200,
    )
    fwd_delta = fwd.frames[-1].mean(axis=0) - fwd.frames[0].mean(axis=0)
    rev_delta = rev.frames[-1].mean(axis=0) - rev.frames[0].mean(axis=0)
    # Керісінше режимдер, негізінен қарама-қарсы бағытта жылжуы тиіс
    dot = float(np.dot(fwd_delta, rev_delta))
    assert dot < 0


def test_compute_coast_risk_sorted_and_bounded():
    lat, lng, horizon = 44.3, 50.5, 48
    wind, current = _demo_fields(lat, lng, horizon)
    result = run_drift(
        event_lat=lat, event_lng=lng, area_km2=1.7, windage=0.03,
        horizon_hours=horizon, mode="forward",
        wind_by_hour=wind, current_by_hour=current, particle_count=300,
    )
    risks = compute_coast_risk(result, COAST_SECTORS)
    assert len(risks) == len(COAST_SECTORS)
    probs = [r.probability for r in risks]
    assert probs == sorted(probs, reverse=True)
    assert all(0.0 <= p <= 1.0 for p in probs)


def test_interception_none_for_reverse_mode():
    lat, lng, horizon = 44.02, 50.62, 24
    wind, current = _demo_fields(lat, lng, horizon)
    result = run_drift(
        event_lat=lat, event_lng=lng, area_km2=1.7, windage=0.03,
        horizon_hours=horizon, mode="reverse",
        wind_by_hour=wind, current_by_hour=current, particle_count=100,
    )
    assert compute_interception(result, COAST_SECTORS) is None


def test_reverse_origin_none_for_forward_mode():
    lat, lng, horizon = 44.02, 50.62, 24
    wind, current = _demo_fields(lat, lng, horizon)
    result = run_drift(
        event_lat=lat, event_lng=lng, area_km2=1.7, windage=0.03,
        horizon_hours=horizon, mode="forward",
        wind_by_hour=wind, current_by_hour=current, particle_count=100,
    )
    assert compute_reverse_origin(result, lat, lng) is None


def test_reverse_origin_returns_plausible_result():
    lat, lng, horizon = 44.02, 50.62, 24
    wind, current = _demo_fields(lat, lng, horizon)
    result = run_drift(
        event_lat=lat, event_lng=lng, area_km2=1.7, windage=0.03,
        horizon_hours=horizon, mode="reverse",
        wind_by_hour=wind, current_by_hour=current, particle_count=200,
    )
    origin = compute_reverse_origin(result, lat, lng)
    assert origin is not None
    assert origin.radius_km > 0
    assert origin.bearing_label in {
        "солтүстік", "солтүстік-шығыс", "шығыс", "оңтүстік-шығыс",
        "оңтүстік", "оңтүстік-батыс", "батыс", "солтүстік-батыс",
    }
