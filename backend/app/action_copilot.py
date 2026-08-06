"""
Action Copilot — есептеу нәтижесінен қысқа жедел ұсыныс генерациялайды.

Ескерту: бұл генеративті AI (LLM) емес — нәтиже толығымен физикалық
модель мен ереже негізінде есептелген сандардан құрастырылған үлгі
(template) мәтін. Бұл — жобаның өз позициясы: "негізгі болжамды
генеративті AI емес, математикалық модель есептейді".
"""
from __future__ import annotations

from .drift_model import InterceptionResult, ReverseOriginResult, SectorRisk


def forward_action_text(top: SectorRisk | None, interception: InterceptionResult | None) -> str:
    if top is None or top.probability < 0.05:
        return "Ағымдағы параметрлер бойынша жағалауға айтарлықтай қауіп анықталған жоқ. Бақылауды жалғастыру ұсынылады."

    pct = round(top.probability * 100)
    eta = top.eta_hour if top.eta_hour is not None else "белгісіз"
    parts = [f"Келесі {eta} сағат ішінде «{top.sector.name}» секторына жету ықтималдығы — {pct}%."]

    if interception:
        parts.append(
            f"Ұсынылатын тоқтату нүктесі: {interception.lat:.3f}, {interception.lng:.3f} "
            f"(уақыт терезесі: {interception.window_start_hour}–{interception.window_end_hour} сағат)."
        )
        parts.append(
            f"Осы нүктеде ұстау, жағалауда тазалауға қарағанда есептелген аудан бойынша "
            f"~{interception.area_ratio}× тиімдірек."
        )

    parts.append(
        f"Бақылау тобын «{top.sector.name}» секторына жіберу және {eta} сағаттан кейін "
        f"спутник суретімен қайта тексеру ұсынылады."
    )
    return " ".join(parts)


def reverse_action_text(origin: ReverseOriginResult | None) -> str:
    if origin is None:
        return "Кері есептеу үшін жеткілікті дерек жоқ."
    return (
        f"Ықтимал бастапқы аймақ — табылған нүктеден шамамен {round(origin.distance_from_found_km)} км "
        f"{origin.bearing_label} бағытта, ~{origin.radius_km} км радиуста. "
        f"Осы аймақтағы кеме қозғалысы мен инфрақұрылымды тексеру ұсынылады."
    )
