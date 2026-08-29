from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import datetime, date
import uuid
from backend.app.core.database import Base

class CognitiveScore(Base):
    __tablename__ = "cognitive_scores"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    date = Column(Date, default=date.today, index=True)
    
    # 4 Clinical Cognitive Domains (0-100 normalized score)
    memory_score = Column(Float, default=70.0)       # Working Memory (Pairs match)
    attention_score = Column(Float, default=70.0)    # Selective Attention / Speed (Odd-One-Out)
    sequencing_score = Column(Float, default=70.0)   # Executive Function / Sequencing (Daily steps)
    pattern_score = Column(Float, default=70.0)      # Visuospatial / Pattern (Recognition)
    
    # Aggregated Composite Score & EWMA Smoothed Score
    composite_score = Column(Float, default=70.0)
    ewma_score = Column(Float, default=70.0)
    
    # Clinical Equivalent Mapping (MoCA & MMSE estimation)
    moca_equivalent = Column(Float, default=22.0)
    mmse_equivalent = Column(Float, default=25.0)
    clinical_stage = Column(String(30), default="MCI")  # 'Normal', 'MCI', 'Mild Dementia', 'Moderate/Severe'
    
    # Trend Analysis
    trend_flag = Column(String(20), default="stable")  # 'improving', 'stable', 'declining'
    slope_7d = Column(Float, default=0.0)
    slope_30d = Column(Float, default=0.0)
    cusum_statistic = Column(Float, default=0.0)
    
    sessions_count = Column(Integer, default=1)
    calculated_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="cognitive_scores")

class DDAConfig(Base):
    __tablename__ = "dda_configs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"), unique=True, nullable=False)
    
    # Heuristic weights for on-device DDA: score = w1*accuracy + w2*(1-norm_rt) - w3*hint_rate
    w1_accuracy = Column(Float, default=0.55)
    w2_speed = Column(Float, default=0.30)
    w3_hints = Column(Float, default=0.15)
    
    # Thresholds
    threshold_up = Column(Float, default=0.75)
    threshold_down = Column(Float, default=0.40)
    
    # Current active difficulty per game (1-5)
    current_difficulty_memory = Column(Integer, default=1)
    current_difficulty_attention = Column(Integer, default=1)
    current_difficulty_sequencing = Column(Integer, default=1)
    current_difficulty_pattern = Column(Integer, default=1)
    
    consecutive_abandoned = Column(Integer, default=0)
    stable_sessions_count = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow)
