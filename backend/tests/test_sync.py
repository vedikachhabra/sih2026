import pytest
import uuid
from datetime import datetime, timedelta
from backend.app.core.database import SessionLocal, Base, engine
from backend.app.models.patient import Patient
from backend.app.models.session import GameSession
from backend.app.schemas.sync_schemas import GameSessionSyncItem
from backend.app.services.sync_service import sync_service

@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()

def test_idempotent_batch_sync(db_session):
    patient_id = "test-sync-patient-001"
    sess_uuid = str(uuid.uuid4())
    
    session_item = GameSessionSyncItem(
        local_id=sess_uuid,
        game_type="memory",
        difficulty_level=1,
        accuracy=0.85,
        avg_reaction_time_ms=1420,
        hints_used=1,
        rounds_completed=1,
        completion_status="completed",
        started_at=datetime.utcnow() - timedelta(minutes=5),
        ended_at=datetime.utcnow()
    )
    
    # 1. First batch push -> Ingested = 1, Duplicate = 0
    ingested_1, dup_1 = sync_service.ingest_game_sessions_batch(
        db=db_session,
        patient_id=patient_id,
        sessions=[session_item]
    )
    assert ingested_1 == 1
    assert dup_1 == 0
    
    # Verify record in DB
    db_record = db_session.query(GameSession).filter(GameSession.id == sess_uuid).first()
    assert db_record is not None
    assert db_record.accuracy == 0.85
    
    # 2. Second batch push with SAME UUID (e.g. device retried after network glitch) -> Ingested = 0, Duplicate = 1
    ingested_2, dup_2 = sync_service.ingest_game_sessions_batch(
        db=db_session,
        patient_id=patient_id,
        sessions=[session_item]
    )
    assert ingested_2 == 0
    assert dup_2 == 1
    
    # Total count in DB for this UUID must still be exactly 1
    total_matches = db_session.query(GameSession).filter(GameSession.id == sess_uuid).count()
    assert total_matches == 1
