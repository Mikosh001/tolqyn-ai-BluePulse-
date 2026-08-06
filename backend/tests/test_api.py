import os

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

DEMO_IMAGE = os.path.join(os.path.dirname(__file__), "..", "sample_data", "demo_satellite.jpg")


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_sectors():
    r = client.get("/api/sectors")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 4
    assert {"id", "name", "lat", "lng", "radius_km", "kind"} <= data[0].keys()


def test_object_types():
    r = client.get("/api/object-types")
    assert r.status_code == 200
    ids = {o["id"] for o in r.json()}
    assert {"oil", "plastic", "net", "bio"} <= ids


def test_simulate_forward_demo_mode():
    payload = {
        "event": {"lat": 44.02, "lng": 50.62},
        "area_km2": 1.7,
        "object_type": "oil",
        "horizon_hours": 24,
        "mode": "forward",
        "data_source": "demo",
        "particle_count": 150,
    }
    r = client.post("/api/simulate", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["mode"] == "forward"
    assert len(body["frames"]) == 25  # 0..24 сағат
    assert body["sector_risks"] is not None
    assert len(body["sector_risks"]) == 4
    assert body["reverse_origin"] is None
    assert body["wind_data_source"] == "demo"
    assert body["current_data_source"] == "demo"
    assert isinstance(body["recommended_action"], str) and body["recommended_action"]


def test_simulate_reverse_demo_mode():
    payload = {
        "event": {"lat": 44.02, "lng": 50.62},
        "area_km2": 1.7,
        "object_type": "bio",
        "horizon_hours": 12,
        "mode": "reverse",
        "data_source": "demo",
        "particle_count": 150,
    }
    r = client.post("/api/simulate", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["mode"] == "reverse"
    assert body["sector_risks"] is None
    assert body["interception"] is None
    assert body["reverse_origin"] is not None


def test_simulate_rejects_unknown_object_type():
    payload = {
        "event": {"lat": 44.02, "lng": 50.62},
        "object_type": "unknown-type",
        "horizon_hours": 12,
        "mode": "forward",
        "data_source": "demo",
    }
    r = client.post("/api/simulate", json=payload)
    assert r.status_code == 400


def test_simulate_rejects_out_of_range_horizon():
    payload = {
        "event": {"lat": 44.02, "lng": 50.62},
        "object_type": "oil",
        "horizon_hours": 999,
        "mode": "forward",
        "data_source": "demo",
    }
    r = client.post("/api/simulate", json=payload)
    assert r.status_code == 422  # pydantic validation


def test_detect_anomaly_endpoint():
    with open(DEMO_IMAGE, "rb") as f:
        r = client.post(
            "/api/detect-anomaly",
            files={"file": ("demo_satellite.jpg", f, "image/jpeg")},
        )
    assert r.status_code == 200
    body = r.json()
    assert len(body["anomalies"]) >= 1
    assert body["annotated_image_base64"]


def test_detect_anomaly_rejects_bad_content_type():
    r = client.post(
        "/api/detect-anomaly",
        files={"file": ("note.txt", b"hello", "text/plain")},
    )
    assert r.status_code == 400
