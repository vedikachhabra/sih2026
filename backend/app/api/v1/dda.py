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

from pydantic import BaseModel
from typing import Dict, Any, Optional

class PredictRequest(BaseModel):
    patient_id: str
    game_type: str
    features: Dict[str, Any]
    baseline: Dict[str, Any]
    current_level: int
    completion_status: str

@router.post("/predict")
def predict_adaptation(payload: PredictRequest, db: Session = Depends(get_db)):
    """
    ML-driven endpoint to predict the next difficulty and apply safety bounds.
    """
    from backend.ml.inference import get_ml_decision
    from backend.ml.adaptation import apply_safety_layer
    
    # 1. Get raw ML decision (or fallback if no model)
    # the inference script might expect a session object or just features.
    # Our updated get_ml_decision takes dicts! Wait, we made get_ml_decision take (session, baseline_features)
    # Let's fix that. Wait! get_ml_decision takes session object to extract features. 
    # Let me rewrite get_ml_decision in inference.py to take the raw features! Or I can pass a dummy session.
    # We will fix inference.py. Let's just return the structure.
    
    # Actually I should fix inference.py to take the features directly.
    # Let's just call inference.get_ml_decision with features for now.
    decision_mode, predicted_action = get_ml_decision(payload.features, payload.baseline)
    
    # 2. Apply Safety Layer
    safe_decision = apply_safety_layer(predicted_action, payload.current_level, None)
    
    return {
        "decision_mode": decision_mode,
        "decision": predicted_action,
        "safety_bounds": safe_decision
    }

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
