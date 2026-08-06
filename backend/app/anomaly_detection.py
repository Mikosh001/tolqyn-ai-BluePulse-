"""
Satellite Anomaly Detection — Sentinel-тектес суреттен мұнай дағына ұқсас
аномалияны анықтайтын классикалық computer-vision модулі.

ЕСКЕРТУ (жобаның өз позициясы бойынша): нәтиже "расталған төгінді" ЕМЕС,
"тексеруді қажет ететін аномалия". Желсіз аумақтар, бұлт көлеңкесі және
табиғи құбылыстар (фитопланктон, тұнба) ұқсас көрініс бере алады.

Әдіс: судың бетіндегі мұнай дағы әдетте қоршаған судан
  (а) қараңғылау және
  (б) тегіс/біртекті (аз текстуралы)
болып көрінеді (SAR/оптикалық суреттерде кеңінен қолданылатын эвристика).
Нақты Sentinel Hub/Copernicus интеграциясы OAuth тіркелгісін қажет етеді —
бұл модуль кез келген жүктелген (демо немесе нақты) суретпен жұмыс істейді,
осылайша команда алдымен алгоритмді дәлелдеп, кейін тек сурет көзін
ауыстырады (`sentinel_client.py` — TODO, төменде README-де сипатталған).
"""
from __future__ import annotations

import base64
from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class Anomaly:
    x: int
    y: int
    w: int
    h: int
    area_px: int
    darkness_score: float
    smoothness_score: float
    confidence: float


def _to_bgr(image_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Суретті оқу мүмкін болмады — қолдау көрсетілетін формат: JPG/PNG")
    return img


def detect_anomalies(
    image_bytes: bytes,
    min_area_px: int = 280,
    darkness_percentile: float = 12.0,
) -> tuple[list[Anomaly], str]:
    img = _to_bgr(image_bytes)
    h_img, w_img = img.shape[:2]

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray_blur = cv2.GaussianBlur(gray, (5, 5), 0)

    # --- Қараңғылық картасы: жергілікті орташадан ауытқу ---
    # Жергілікті терезе объектінің әдеттегі өлшемінен үлкенірек болуы тиіс,
    # бірақ бүкіл кадрдан кішірек — сурет масштабына бейімделеді.
    win = max(31, (min(h_img, w_img) // 6) | 1)  # тақ сан
    local_mean = cv2.blur(gray_blur, (win, win))
    darkness = local_mean.astype(np.int16) - gray_blur.astype(np.int16)  # >0 => қараңғы дақ
    darkness = np.clip(darkness, 0, 255).astype(np.uint8)

    threshold = np.percentile(darkness, 100 - darkness_percentile)
    threshold = max(float(threshold), 6.0)
    _, dark_mask = cv2.threshold(darkness, threshold, 255, cv2.THRESH_BINARY)

    # --- Тегістік картасы: Лаплас дисперсиясы (confidence үшін, soft) ---
    laplacian = cv2.Laplacian(gray_blur, cv2.CV_32F, ksize=3)
    texture = cv2.blur(np.abs(laplacian), (15, 15))
    texture_norm = cv2.normalize(texture, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

    # Қараңғылық — негізгі белгі; тегістік бөлек hard-mask ретінде емес,
    # әр контур үшін confidence салмағы ретінде қолданылады (төменде).
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    combined = cv2.morphologyEx(dark_mask, cv2.MORPH_OPEN, kernel)
    combined = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(combined, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    anomalies: list[Anomaly] = []
    annotated = img.copy()

    for c in contours:
        area = cv2.contourArea(c)
        if area < min_area_px:
            continue
        x, y, w, h = cv2.boundingRect(c)
        mask_roi = np.zeros(gray.shape, dtype=np.uint8)
        cv2.drawContours(mask_roi, [c], -1, 255, -1)

        darkness_score = float(np.mean(darkness[mask_roi == 255])) / 255.0
        smoothness_score = 1.0 - float(np.mean(texture_norm[mask_roi == 255])) / 255.0
        confidence = round(min(0.97, 0.35 + 0.4 * darkness_score + 0.35 * smoothness_score), 2)

        anomalies.append(
            Anomaly(
                x=int(x), y=int(y), w=int(w), h=int(h),
                area_px=int(area),
                darkness_score=round(darkness_score, 3),
                smoothness_score=round(smoothness_score, 3),
                confidence=confidence,
            )
        )
        color = (0, 210, 160) if confidence >= 0.6 else (0, 170, 255)
        cv2.rectangle(annotated, (x, y), (x + w, y + h), color, 2)
        cv2.putText(
            annotated, f"{confidence:.0%}", (x, max(0, y - 8)),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2,
        )

    anomalies.sort(key=lambda a: a.confidence, reverse=True)

    ok, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 88])
    annotated_b64 = base64.b64encode(buf.tobytes()).decode("ascii") if ok else ""

    return anomalies, annotated_b64
