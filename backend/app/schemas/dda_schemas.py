from pydantic import BaseModel, Field
from typing import Optional

class NextDifficultyRequest(BaseModel):
    patient_id: str
    game_type: str  # 'memory', 'attention', 'sequencing', 'pattern'
    recent_accuracy: float = Field(..., ge=0.0, le=1.0)
    recent_reaction_time_ms: int
    recent_hints_used: int = 0
    completion_status: str = "completed"  # 'completed', 'abandoned', 'timeout'

class GameParameters(BaseModel):
    grid_size: Optional[str] = None  # e.g., '3x3', '4x4', '5x5'
    card_count: Optional[int] = None  # e.g., 4, 8, 12
    step_count: Optional[int] = None  # e.g., 3, 5, 7
    time_limit_sec: int
    hint_allowed_count: int
    distractor_count: int = 0

class NextDifficultyResponse(BaseModel):
    patient_id: str
    game_type: str
    current_level: int
    calculated_performance_score: float
    adjustment_action: str  # 'level_up', 'level_down', 'maintain', 'frustration_guard', 'plateau_nudge'
    game_parameters: GameParameters
    reasoning: str
