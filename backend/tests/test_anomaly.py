import pytest
from datetime import date, timedelta
from backend.app.core.database import SessionLocal, Base, engine
from backend.app.models.patient import Patient
from backend.app.models.cognitive import CognitiveScore
from backend.app.services.anomaly_detector import anomaly_detector
from backend.app.services.alert_engine import alert_engine

@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()

def test_cusum_decline_anomaly_detection(db_session):
    patient_id = "test-patient-decline-cusum"
    p = db_session.query(Patient).filter(Patient.id == patient_id).first()
    if not p:
        p = Patient(id=patient_id, name="Test CUSUM Decline", education_years=12)
        db_session.add(p)
        db_session.commit()

    # Clear previous scores
    db_session.query(CognitiveScore).filter(CognitiveScore.patient_id == patient_id).delete()
    db_session.commit()

    # Seed 10 days of stable baseline (score ~80)
    start_d = date(2026, 1, 1)
    for i in range(10):
        s = CognitiveScore(
            patient_id=patient_id,
            date=start_d + timedelta(days=i),
            composite_score=80.0,
            ewma_score=80.0,
            memory_score=80.0,
            attention_score=80.0,
            sequencing_score=80.0,
            pattern_score=80.0
        )
        db_session.add(s)
    db_session.commit()

    # 1. Test when stable -> No alert
    is_drop, pct, diag = anomaly_detector.evaluate_patient_trajectory(db_session, patient_id)
    assert not is_drop
    assert pct < 5.0

    # 2. Add 7 days of sharp sustained decline (dropping from 80 down to 55 -> ~31% drop)
    for i in range(10, 17):
        drop_val = 80.0 - (i - 9) * 3.8  # 76.2 -> 53.4
        s = CognitiveScore(
            patient_id=patient_id,
            date=start_d + timedelta(days=i),
            composite_score=drop_val,
            ewma_score=drop_val,
            memory_score=drop_val,
            attention_score=drop_val,
            sequencing_score=drop_val,
            pattern_score=drop_val
        )
        db_session.add(s)
    db_session.commit()

    # 3. Test CUSUM trigger -> Must flag sustained drop >15%
    is_drop_alert, pct_drop, diag = anomaly_detector.evaluate_patient_trajectory(db_session, patient_id)
    assert is_drop_alert
    assert pct_drop >= 15.0
    assert diag["cusum_breached"]
    assert diag["final_cusum_statistic"] >= 3.5
