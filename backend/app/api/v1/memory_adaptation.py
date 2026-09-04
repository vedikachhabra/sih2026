from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from backend.app.services import memory_adaptation_service as mas
from backend.ml import memory_bandit as bandit

router = APIRouter(prefix="/memory-adaptation", tags=["Memory Pairs Online AI Adaptation"])


class SessionCompletePayload(BaseModel):
    difficulty_level: int = 1
    accuracy: float = 0.0
    total_attempts: int = 0
    correct_attempts: int = 0
    incorrect_attempts: int = 0
    hints_used: int = 0
    hint_limit: int = 3
    pair_count: int = 2
    pairs_completed: int = 0
    time_limit_sec: int = 60
    avg_reaction_time_ms: Optional[int] = None
    average_attempt_duration_ms: Optional[int] = None
    maximum_hesitation_ms: Optional[int] = 0
    completion_status: str = "completed"


@router.get("/{patient_id}/current-config")
def get_current_config(patient_id: str):
    """Called when Memory Pairs launches, so it starts with whatever the AI last decided."""
    state = bandit.load_patient_state(patient_id)
    return {
        "patient_id": patient_id,
        "configuration": state["current_config"],
        "model_status": bandit.model_status(state),
        "training_observations": state["observations"],
    }


@router.post("/{patient_id}/session-complete")
def session_complete(patient_id: str, payload: SessionCompletePayload):
    """The single authoritative decision path for Memory Pairs adaptation."""
    diagnostics = mas.decide_next_configuration(patient_id, payload.dict())
    return diagnostics