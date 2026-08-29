from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class GameSessionSyncItem(BaseModel):
    local_id: str = Field(..., description="Client-generated UUID for idempotency")
    game_type: str  # 'memory', 'attention', 'sequencing', 'pattern'
    difficulty_level: int = 1
    accuracy: float = Field(..., ge=0.0, le=1.0)
    avg_reaction_time_ms: int
    hints_used: int = 0
    rounds_completed: int = 1
    completion_status: str = "completed"  # 'completed', 'abandoned', 'timeout'
    started_at: datetime
    ended_at: datetime
    device_info: Optional[str] = None

class BatchGameSessionsRequest(BaseModel):
    patient_id: str
    sessions: List[GameSessionSyncItem]

class TaskLogSyncItem(BaseModel):
    local_id: str
    task_type: str  # 'medication', 'hydration', 'meal', 'appointment', 'exercise'
    title: Optional[str] = None
    scheduled_time: datetime
    completed_time: Optional[datetime] = None
    status: str = "done"  # 'done', 'missed', 'snoozed'
    notes: Optional[str] = None

class BatchTaskLogsRequest(BaseModel):
    patient_id: str
    tasks: List[TaskLogSyncItem]

class MoodLogSyncItem(BaseModel):
    local_id: str
    mood_score: int = Field(..., ge=1, le=5)
    logged_at: datetime
    notes: Optional[str] = None

class BatchMoodLogsRequest(BaseModel):
    patient_id: str
    moods: List[MoodLogSyncItem]

class SyncBatchResponse(BaseModel):
    success: bool
    ingested_count: int
    skipped_duplicates_count: int
    server_timestamp: datetime
    message: str

class PullSyncResponse(BaseModel):
    patient_id: str
    patient_name: str
    preferred_language: str
    dementia_stage: str
    dda_config: dict
    reminders: List[dict]
    server_timestamp: datetime
