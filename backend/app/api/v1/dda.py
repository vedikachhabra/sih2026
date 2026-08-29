from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.dda_schemas import NextDifficultyRequest, NextDifficultyResponse
from backend.app.services.dda_engine import dda_engine

router = APIRouter(prefix="/dda", tags=["Dynamic Difficulty Adjustment (DDA)"])

@router.post("/next-difficulty", response_model=NextDifficultyResponse)
def get_next_difficulty(payload: NextDifficultyRequest, db: Session = Depends(get_db)):
    """
    Computes real-time difficulty adjustment based on recent game metrics.
    Applies Frustration Guard and Plateau Guard.
    """
    res = dda_engine.evaluate_next_difficulty(
        db=db,
        patient_id=payload.patient_id,
        game_type=payload.game_type,
        recent_accuracy=payload.recent_accuracy,
        recent_reaction_time_ms=payload.recent_reaction_time_ms,
        recent_hints_used=payload.recent_hints_used,
        completion_status=payload.completion_status
    )
    return res

@router.get("/config/{patient_id}")
def get_patient_dda_config(patient_id: str, db: Session = Depends(get_db)):
    """
    Fetches the active DDA weight parameters and per-game difficulty state.
    """
    cfg = dda_engine.get_or_create_config(db, patient_id)
    return {
        "patient_id": cfg.patient_id,
        "weights": {
            "w1_accuracy": cfg.w1_accuracy,
            "w2_speed": cfg.w2_speed,
            "w3_hints": cfg.w3_hints
        },
        "thresholds": {
            "threshold_up": cfg.threshold_up,
            "threshold_down": cfg.threshold_down
        },
        "active_levels": {
            "memory": cfg.current_difficulty_memory,
            "attention": cfg.current_difficulty_attention,
            "sequencing": cfg.current_difficulty_sequencing,
            "pattern": cfg.current_difficulty_pattern
        },
        "consecutive_abandoned": cfg.consecutive_abandoned,
        "updated_at": cfg.updated_at
    }
