import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "PS26003 Cognitive Care Platform (NER)"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "super-secret-key-for-cognitive-care-ner-sih-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DATABASE_URL: str = "sqlite:///./cognitive_care.db"
    
    # DPDP Act 2023 Compliance
    DATA_RETENTION_DAYS: int = 365
    AUDIT_LOG_ENABLED: bool = True
    
    # Statistical / Clinical Calibration Defaults (MoCA & OASIS-derived)
    POP_MEAN_ACCURACY: float = 0.78
    POP_SD_ACCURACY: float = 0.16
    POP_MEAN_RT_MS: float = 1850.0
    POP_SD_RT_MS: float = 650.0
    POP_MEAN_HINTS: float = 1.2
    POP_SD_HINTS: float = 1.1
    
    # Cognitive Decline Alert Threshold (EWMA + CUSUM)
    DECLINE_THRESHOLD_PERCENT: float = 0.15  # >15% decline trigger
    EWMA_LAMBDA: float = 0.25
    CUSUM_K: float = 0.5  # Reference value in standard deviations
    CUSUM_H: float = 3.5  # Decision interval threshold
    
    class Config:
        case_sensitive = True

settings = Settings()
