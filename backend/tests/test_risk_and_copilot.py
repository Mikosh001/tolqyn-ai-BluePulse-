from app.config import COAST_SECTORS
from app.drift_model import SectorRisk
from app.risk_model import score_sectors
from app.action_copilot import forward_action_text, reverse_action_text


def _fake_sector_risks():
    return [
        SectorRisk(sector=COAST_SECTORS[0], probability=0.74, eta_hour=27),
        SectorRisk(sector=COAST_SECTORS[1], probability=0.41, eta_hour=None),
        SectorRisk(sector=COAST_SECTORS[2], probability=0.63, eta_hour=31),
        SectorRisk(sector=COAST_SECTORS[3], probability=0.12, eta_hour=None),
    ]


def test_score_sectors_protected_area_boosted():
    risks = _fake_sector_risks()
    scored = score_sectors(risks, horizon_hours=48)
    assert len(scored) == 4
    # "protected" аймақтар "city" аймағынан жоғары салмақ алуы тиіс —
    # тіпті ықтималдық жақын болса да
    protected = [s for s in scored if s.sector_id in ("tupkaragan", "protected")]
    assert all(s.sensitivity_weight >= 1.3 for s in protected)
    scores = [s.score for s in scored]
    assert scores == sorted(scores, reverse=True)


def test_forward_action_text_mentions_top_sector():
    risks = _fake_sector_risks()
    text = forward_action_text(risks[0], None)
    assert risks[0].sector.name in text
    assert "%" in text


def test_forward_action_text_low_risk():
    from app.config import CoastSector
    low = SectorRisk(sector=COAST_SECTORS[0], probability=0.01, eta_hour=None)
    text = forward_action_text(low, None)
    assert "қауіп анықталған жоқ" in text


def test_reverse_action_text_handles_none():
    text = reverse_action_text(None)
    assert "жоқ" in text
