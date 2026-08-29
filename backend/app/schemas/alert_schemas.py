from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AlertBase(BaseModel):
    patient_id: str
    alert_type: str  # 'score_drop', 'missed_medication', 'inactivity', 'low_mood', 'frustration_detected'
    severity: str    # 'high', 'medium', 'low'
    title: str
    message: str
    metric_value: Optional[str] = None

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    id: str
    acknowledged: bool
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    action_taken: Optional[str] = None
    created_at: datetime
    patient_name: Optional[str] = None
    patient_region: Optional[str] = None

    class Config:
        from_attributes = True

class AcknowledgeAlertRequest(BaseModel):
    acknowledged_by: str
    action_taken: Optional[str] = "Reviewed and contacted patient/caregiver"

class ReminderCreate(BaseModel):
    patient_id: str
    task_type: str = "medication"
    title: str
    time_of_day: str = "08:00"
    dosage: Optional[str] = None
    audio_prompt_key: str = "med_morning"
    cron_schedule: str = "0 8 * * *"

class ReminderResponse(ReminderCreate):
    id: str
    active: bool
    created_at: datetime
    class Config:
        from_attributes = True
