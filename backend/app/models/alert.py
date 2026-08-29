from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from backend.app.core.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    alert_type = Column(String(40), nullable=False)  # 'score_drop', 'missed_medication', 'inactivity', 'low_mood', 'frustration_detected'
    severity = Column(String(10), default="medium")  # 'high', 'medium', 'low'
    title = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    metric_value = Column(String(50), nullable=True)  # e.g., "-18.5% over 7 days"
    acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    action_taken = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="alerts")
