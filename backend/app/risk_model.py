"""
Risk Prediction — тәуекел деңгейін бағалайтын түсіндірілетін модель.

Бұл терең оқыту моделі емес — ашық, тексерілетін ережелерге негізделген
баллдау жүйесі (weighted scoring). Хакатон ережесінде (7-бөлім) команда
өз AI-компонентінің логикасын түсіндіре алуы міндетті делінген — сол
себепті әдейі "black box" емес, әр фактордың салмағы кодта көрінеді.

risk_score = particle_probability × sector_sensitivity × urgency_factor
"""
from __future__ import annotations

from dataclasses import dataclass

from .config import CoastSector
from .drift_model import SectorRisk

# Аймақ түріне байланысты сезімталдық салмағы (неғұрлым осал болса,
# соғұрлым бірдей ықтималдықта да басымдық жоғары болады)
SECTOR_SENSITIVITY = {
    "protected": 1.3,
    "port": 1.15,
    "city": 1.0,
}


@dataclass
class RiskScore:
    sector_id: str
    probability: float
    sensitivity_weight: float
    urgency_factor: float
    score: float  # 0..~130, салыстырмалы басымдық баллы
    explanation: str


def _urgency_factor(eta_hour: int | None, horizon_hours: int) -> float:
    if eta_hour is None:
        return 1.0
    remaining_share = max(0.0, (horizon_hours - eta_hour) / max(horizon_hours, 1))
    # Оқиға неғұрлым тезірек келсе, соғұрлым жедел әрекет басымдығы жоғары
    return round(1.0 + remaining_share * 0.5, 3)


def score_sectors(sector_risks: list[SectorRisk], horizon_hours: int) -> list[RiskScore]:
    scored: list[RiskScore] = []
    for r in sector_risks:
        sensitivity = SECTOR_SENSITIVITY.get(r.sector.kind, 1.0)
        urgency = _urgency_factor(r.eta_hour, horizon_hours)
        score = round(r.probability * 100 * sensitivity * urgency, 1)
        explanation = (
            f"Ықтималдық {round(r.probability * 100)}% × сектор сезімталдығы "
            f"×{sensitivity} ({r.sector.kind}) × жеделдік ×{urgency}"
        )
        scored.append(
            RiskScore(
                sector_id=r.sector.id,
                probability=r.probability,
                sensitivity_weight=sensitivity,
                urgency_factor=urgency,
                score=score,
                explanation=explanation,
            )
        )
    scored.sort(key=lambda s: s.score, reverse=True)
    return scored
