import os

import pytest

from app.anomaly_detection import detect_anomalies

DEMO_IMAGE = os.path.join(os.path.dirname(__file__), "..", "sample_data", "demo_satellite.jpg")


def test_detect_anomalies_finds_the_synthetic_slick():
    with open(DEMO_IMAGE, "rb") as f:
        data = f.read()
    anomalies, annotated_b64 = detect_anomalies(data)
    assert len(anomalies) >= 1
    assert annotated_b64  # base64 жолы бос емес
    # Ең үлкен аудан — біз салған негізгі дақ болуы тиіс
    biggest = max(anomalies, key=lambda a: a.area_px)
    assert biggest.area_px > 2000
    assert 0.0 <= biggest.confidence <= 1.0


def test_detect_anomalies_rejects_garbage_bytes():
    with pytest.raises(ValueError):
        detect_anomalies(b"not-an-image")
