import pytest
from backend.app.core.database import SessionLocal, Base, engine
from backend.app.models.patient import Patient
from backend.app.models.cognitive import DDAConfig
from backend.app.services.dda_engine import dda_engine

@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()

def test_dda_score_calculation():
    # High performance: 95% accuracy, fast reaction time (700ms), 0 hints
    score_high = dda_engine.compute_dda_score(accuracy=0.95, reaction_time_ms=700, hints_used=0, level=1)
    assert score_high >= 0.70

    # Low performance: 40% accuracy, slow reaction time (3800ms), 3 hints
    score_low = dda_engine.compute_dda_score(accuracy=0.40, reaction_time_ms=3800, hints_used=3, level=1)
    assert score_low <= 0.40

def test_frustration_guard(db_session):
    patient_id = "test-patient-frustration"
    p = db_session.query(Patient).filter(Patient.id == patient_id).first()
    if not p:
        p = Patient(id=patient_id, name="Test Frustration")
        db_session.add(p)
        db_session.commit()
        
    cfg = dda_engine.get_or_create_config(db_session, patient_id)
    cfg.current_difficulty_memory = 3
    cfg.consecutive_abandoned = 0
    db_session.commit()
    
    # First abandoned session -> maintains level
    res1 = dda_engine.evaluate_next_difficulty(
        db=db_session,
        patient_id=patient_id,
        game_type="memory",
        recent_accuracy=0.0,
        recent_reaction_time_ms=0,
        completion_status="abandoned"
    )
    assert res1["adjustment_action"] == "maintain"
    assert res1["current_level"] == 3
    
    # Second abandoned session -> triggers Frustration Guard, eases by 2.0 to level 1
    res2 = dda_engine.evaluate_next_difficulty(
        db=db_session,
        patient_id=patient_id,
        game_type="memory",
        recent_accuracy=0.0,
        recent_reaction_time_ms=0,
        completion_status="abandoned"
    )
    assert res2["adjustment_action"] == "frustration_guard"
    assert res2["current_level"] == 1
    assert "Frustration guard triggered" in res2["reasoning"]

def test_level_up_and_plateau_guard(db_session):
    patient_id = "test-patient-progression"
    p = db_session.query(Patient).filter(Patient.id == patient_id).first()
    if not p:
        p = Patient(id=patient_id, name="Test Progression")
        db_session.add(p)
        db_session.commit()
        
    cfg = dda_engine.get_or_create_config(db_session, patient_id)
    cfg.current_difficulty_attention = 1
    db_session.commit()
    
    # High score session -> level up from 1 to 2
    res = dda_engine.evaluate_next_difficulty(
        db=db_session,
        patient_id=patient_id,
        game_type="attention",
        recent_accuracy=0.98,
        recent_reaction_time_ms=700,
        recent_hints_used=0,
        completion_status="completed"
    )
    assert res["adjustment_action"] == "level_up"
    assert res["current_level"] == 2
    assert res["game_parameters"]["grid_size"] == "3x3"
