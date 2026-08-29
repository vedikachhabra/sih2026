from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from backend.app.core.database import Base

class Caregiver(Base):
    __tablename__ = "caregivers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    role = Column(String(20), default="family")  # 'family', 'clinician', 'health_worker'
    password_hash = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    patients = relationship("Patient", back_populates="caregiver")

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    dob = Column(String(20), nullable=True)
    age = Column(Integer, default=72)
    gender = Column(String(20), default="Male")
    education_years = Column(Integer, default=10)
    preferred_language = Column(String(10), default="as")  # 'as', 'bn', 'mni', 'kha', 'lus', 'hi', 'en'
    dementia_stage = Column(String(20), default="MCI")     # 'normal', 'MCI', 'mild', 'moderate', 'severe'
    region = Column(String(50), default="Assam (Guwahati)")
    caregiver_id = Column(String, ForeignKey("caregivers.id"), nullable=True)
    caregiver_name = Column(String(100), default="Anjali Barua")
    caregiver_relation = Column(String(50), default="Daughter")
    caregiver_phone = Column(String(50), default="+91 98640-12345")
    baseline_mmse = Column(Float, default=24.0)
    baseline_moca = Column(Float, default=22.0)
    device_id = Column(String(100), nullable=True)
    last_synced_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    caregiver = relationship("Caregiver", back_populates="patients")
    game_sessions = relationship("GameSession", back_populates="patient", cascade="all, delete-orphan")
    cognitive_scores = relationship("CognitiveScore", back_populates="patient", cascade="all, delete-orphan")
    task_logs = relationship("TaskLog", back_populates="patient", cascade="all, delete-orphan")
    mood_logs = relationship("MoodLog", back_populates="patient", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="patient", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="patient", cascade="all, delete-orphan")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id = Column(String, nullable=False)
    actor_role = Column(String(30), nullable=False)
    action = Column(String(50), nullable=False)  # 'export_report', 'view_patient', 'sync_ingest', 'acknowledge_alert'
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String, nullable=False)
    ip_address = Column(String(50), default="127.0.0.1")
    timestamp = Column(DateTime, default=datetime.utcnow)
