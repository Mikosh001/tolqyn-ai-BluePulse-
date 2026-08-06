"""
Жағалау секторлары мен объект түрлерінің конфигурациясы.
Frontend-тегі src/data/geo.ts файлымен синхрондалған.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class CoastSector:
    id: str
    name: str
    lat: float
    lng: float
    radius_km: float
    kind: str


COAST_SECTORS: list[CoastSector] = [
    CoastSector("tupkaragan", "Түпқараған", 44.61, 50.34, 18, "protected"),
    CoastSector("bautino", "Баутино порты", 44.548, 50.265, 14, "port"),
    CoastSector("protected", "Қорғалатын аймақ (итбалық мекені)", 44.22, 50.98, 20, "protected"),
    CoastSector("aktau", "Ақтау жағалауы", 43.651, 51.198, 16, "city"),
]


@dataclass(frozen=True)
class ObjectType:
    id: str
    label: str
    windage: float  # жел әсер ету коэффициенті


OBJECT_TYPES: list[ObjectType] = [
    ObjectType("oil", "Мұнайға ұқсас дақ", 0.03),
    ObjectType("plastic", "Қалқымалы пластик", 0.04),
    ObjectType("net", "Балық аулау торы", 0.02),
    ObjectType("bio", "Биологиялық объект", 0.012),
]

OBJECT_TYPE_MAP = {o.id: o for o in OBJECT_TYPES}

DEFAULT_EVENT = {"lat": 44.02, "lng": 50.62, "area_km2": 1.7}

# CORS үшін рұқсат етілген frontend мекенжайлары (dev + деплой)
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://mikosh001.github.io",
]
