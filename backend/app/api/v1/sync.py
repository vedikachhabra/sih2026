from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from backend.app.core.database import get_db
from backend.app.schemas.sync_schemas import (
    BatchGameSessionsRequest,
    BatchTaskLogsRequest,
    BatchMoodLogsRequest,
    SyncBatchResponse,
    PullSyncResponse
)
from backend.app.services.sync_service import sync_service

router = APIRouter(prefix="/sync", tags=["Offline Batch Sync & Ingestion"])

@router.post("/game-sessions/batch", response_model=SyncBatchResponse)
def batch_sync_game_sessions(payload: BatchGameSessionsRequest, db: Session = Depends(get_db)):
    """
    Idempotent batch upload of on-device game sessions.
    Client UUIDs ensure zero duplication on retries.
    """
    ingested, duplicates = sync_service.ingest_game_sessions_batch(
        db=db,
        patient_id=payload.patient_id,
        sessions=payload.sessions
    )
    return {
        "success": True,
        "ingested_count": ingested,
        "skipped_duplicates_count": duplicates,
        "server_timestamp": datetime.utcnow(),
        "message": f"Successfully processed {ingested} new sessions ({duplicates} updated/idempotent)."
    }

@router.post("/task-logs/batch", response_model=SyncBatchResponse)
def batch_sync_task_logs(payload: BatchTaskLogsRequest, db: Session = Depends(get_db)):
    """
    Idempotent batch upload of routine and medication completion logs.
    """
    ingested, duplicates = sync_service.ingest_task_logs_batch(
        db=db,
        patient_id=payload.patient_id,
        tasks=payload.tasks
    )
    return {
        "success": True,
        "ingested_count": ingested,
        "skipped_duplicates_count": duplicates,
        "server_timestamp": datetime.utcnow(),
        "message": f"Successfully processed {ingested} task logs."
    }

@router.post("/mood-logs/batch", response_model=SyncBatchResponse)
def batch_sync_mood_logs(payload: BatchMoodLogsRequest, db: Session = Depends(get_db)):
    """
    Idempotent batch upload of emoji mood check-ins (1-5 scale).
    """
    ingested, duplicates = sync_service.ingest_mood_logs_batch(
        db=db,
        patient_id=payload.patient_id,
        moods=payload.moods
    )
    return {
        "success": True,
        "ingested_count": ingested,
        "skipped_duplicates_count": duplicates,
        "server_timestamp": datetime.utcnow(),
        "message": f"Successfully processed {ingested} mood logs."
    }

@router.get("/pull/{patient_id}", response_model=PullSyncResponse)
def pull_sync_updates(patient_id: str, since: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Pulls caregiver care plan modifications, reminder schedules, and updated DDA thresholds.
    """
    since_dt = None
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
        except Exception:
            pass
            
    delta = sync_service.generate_delta_pull(db, patient_id, since_dt)
    if "error" in delta:
        raise HTTPException(status_code=404, detail=delta["error"])
        
    return delta
