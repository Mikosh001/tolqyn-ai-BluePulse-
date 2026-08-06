"""
Демо жел/ағыс өрісі — интернет/сыртқы API қолжетімсіз болған кезде
немесе Live Data көзі белгілі бір координатта дерек қайтармаған жағдайда
қолданылатын синтетикалық, бірақ физикалық тұрғыдан ақылға қонымды модель.

Frontend-тегі src/lib/vectorField.ts файлымен бірдей формула — Demo режимінде
екі жақ (backend/frontend) бірдей нәтиже беруі үшін.
"""
import math
from dataclasses import dataclass


@dataclass
class Vector2:
    u: float  # шығысқа қарай, м/с
    v: float  # солтүстікке қарай, м/с


BASE_CURRENT = Vector2(0.07, 0.1)
BASE_WIND = Vector2(3.2, 1.4)


def _wave(x: float, freq: float, phase: float = 0.0) -> float:
    return math.sin(x * freq + phase)


def synthetic_current(lat: float, lng: float, hour: float) -> Vector2:
    gyre = _wave(lat, 4.5, hour * 0.05) * 0.05
    shear = _wave(lng, 5.5, hour * 0.04 + 1.3) * 0.04
    tidal = _wave(hour, 0.26, lat * 2) * 0.03
    return Vector2(BASE_CURRENT.u + shear + tidal, BASE_CURRENT.v + gyre)


def synthetic_wind(lat: float, lng: float, hour: float) -> Vector2:
    gust = _wave(hour, 0.22, lng * 3) * 1.1
    drift = _wave(hour, 0.05) * 0.6
    spatial = _wave(lat + lng, 3, 0) * 0.4
    return Vector2(BASE_WIND.u + gust + spatial, BASE_WIND.v + drift)
