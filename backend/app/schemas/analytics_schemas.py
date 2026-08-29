from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import date, datetime

class DomainScorePoint(BaseModel):
    date: date
    memory_score: float
    attention_score: float
    sequencing_score: float
    pattern_score: float
    composite_score: float
    ewma_score: float
    moca_equivalent: float
    mmse_equivalent: float

class CognitiveTrendsResponse(BaseModel):
    patient_id: str
    patient_name: str
    dementia_stage: str
    date_range: str
    current_composite_score: float
    current_moca_equivalent: float
    current_mmse_equivalent: float
    overall_trend: str  # 'improving', 'stable', 'declining'
    slope_30d: float
    cusum_alert_active: bool
    data_points: List[DomainScorePoint]

class RadarDomainProfile(BaseModel):
    domain: str
    score: float
    norm_baseline: float
    stage_benchmark: float

class PatientCognitiveProfileResponse(BaseModel):
    patient_id: str
    patient_name: str
    age: int
    education_years: int
    region: str
    dementia_stage: str
    radar_domains: List[RadarDomainProfile]
    adherence_rate_30d: float
    total_sessions_played: int
    last_active: Optional[datetime]
