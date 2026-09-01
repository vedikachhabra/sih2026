from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from backend.app.core.database import Base

class GameSession(Base):
    __tablename__ = "game_sessions"

    id = Column(String, primary_key=True)  # Client UUID (for idempotent batch sync)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    game_type = Column(String(30), nullable=False)  # 'memory', 'attention', 'sequencing', 'pattern'
    difficulty_level = Column(Integer, default=1)
    accuracy = Column(Float, nullable=False)
    avg_reaction_time_ms = Column(Integer, nullable=False)
    hints_used = Column(Integer, default=0)
    rounds_completed = Column(Integer, default=1)
    completion_status = Column(String(20), default="completed")  # 'completed', 'abandoned', 'timeout'
    started_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime, nullable=False)
    ingested_at = Column(DateTime, default=datetime.utcnow)
    device_info = Column(String(100), nullable=True)
    extended_telemetry = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="game_sessions")
