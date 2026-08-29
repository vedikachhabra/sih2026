from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from backend.app.core.database import Base

class TaskLog(Base):
    __tablename__ = "task_logs"

    id = Column(String, primary_key=True)  # Client UUID (for idempotent batch sync)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    task_type = Column(String(30), nullable=False)  # 'medication', 'hydration', 'meal', 'appointment', 'exercise'
    title = Column(String(100), nullable=True)
    scheduled_time = Column(DateTime, nullable=False)
    completed_time = Column(DateTime, nullable=True)
    status = Column(String(20), default="done")  # 'done', 'missed', 'snoozed'
    notes = Column(Text, nullable=True)
    ingested_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="task_logs")

class MoodLog(Base):
    __tablename__ = "mood_logs"

    id = Column(String, primary_key=True)  # Client UUID (for idempotent batch sync)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    mood_score = Column(Integer, nullable=False)  # 1 (Sad) to 5 (Very Happy)
    logged_at = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)
    ingested_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="mood_logs")

class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    task_type = Column(String(30), default="medication")  # 'medication', 'hydration', 'meal', 'appointment'
    title = Column(String(100), nullable=False)
    time_of_day = Column(String(10), default="08:00")  # HH:MM
    cron_schedule = Column(String(50), default="0 8 * * *")
    audio_prompt_key = Column(String(50), default="med_morning")
    dosage = Column(String(50), nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="reminders")
    patient.reminders = relationship("Reminder", back_populates="patient", cascade="all, delete-orphan")

class KatzADLAssessment(Base):
    """
    Katz Index of Independence in Activities of Daily Living (ADL)
    Scores 0-6 (6 = Full Function, 4 = Moderate Impairment, 2 or less = Severe Functional Impairment)
    """
    __tablename__ = "katz_adl_assessments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    bathing_independent = Column(Boolean, default=True)      # 1 pt
    dressing_independent = Column(Boolean, default=True)     # 1 pt
    toileting_independent = Column(Boolean, default=True)    # 1 pt
    transferring_independent = Column(Boolean, default=True) # 1 pt
    continence_independent = Column(Boolean, default=True)   # 1 pt
    feeding_independent = Column(Boolean, default=True)      # 1 pt
    total_score = Column(Integer, default=6)                 # 0 to 6
    assessed_by = Column(String(100), nullable=True)
    assessment_date = Column(DateTime, default=datetime.utcnow)

class LawtonIADLAssessment(Base):
    """
    Lawton-Brody Instrumental Activities of Daily Living (IADL) Scale
    Scores 0-8 (8 = High Function/Independent, 0 = Low Function/Dependent)
    """
    __tablename__ = "lawton_iadl_assessments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    telephone_ability = Column(Integer, default=1)           # 0 or 1
    shopping = Column(Integer, default=1)                    # 0 or 1
    food_preparation = Column(Integer, default=1)            # 0 or 1
    housekeeping = Column(Integer, default=1)                # 0 or 1
    laundry = Column(Integer, default=1)                     # 0 or 1
    mode_of_transportation = Column(Integer, default=1)      # 0 or 1
    medication_responsibility = Column(Integer, default=1)   # 0 or 1
    financial_ability = Column(Integer, default=1)           # 0 or 1
    total_score = Column(Integer, default=8)                 # 0 to 8
    assessed_by = Column(String(100), nullable=True)
    assessment_date = Column(DateTime, default=datetime.utcnow)

