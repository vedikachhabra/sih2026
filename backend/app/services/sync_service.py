from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from datetime import datetime
import json

from backend.app.models.patient import Patient
from backend.app.models.session import GameSession
from backend.app.models.task import TaskLog, MoodLog, Reminder
from backend.app.models.cognitive import DDAConfig
from backend.app.schemas.sync_schemas import GameSessionSyncItem, TaskLogSyncItem, MoodLogSyncItem
from backend.app.services.analytics_service import ClinicalCognitiveAnalytics
from backend.app.services.alert_engine import alert_engine

class BatchSyncService:
    """
    Opportunistic Batch Ingestion & Sync Service:
    1. Idempotent upsert of game sessions, task logs, and mood logs using client-generated UUIDs.
    2. Zero data duplication on retries or intermittent connectivity.
    3. Triggers cognitive aggregation & real-time clinical alert evaluations upon batch arrival.
    4. Provides delta pull for profile, care plan/reminders, and DDA updates.
    """

    @classmethod
    def ingest_game_sessions_batch(cls, db: Session, patient_id: str, sessions: List[GameSessionSyncItem]) -> Tuple[int, int]:
        ingested = 0
        duplicates = 0
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            # Auto-create patient placeholder if new device provisioning
            patient = Patient(id=patient_id, name="Patient " + patient_id[:8])
            db.add(patient)
            db.commit()
            
        for s in sessions:
            existing = db.query(GameSession).filter(GameSession.id == s.local_id).first()
            if existing:
                # Update existing record if newer
                existing.accuracy = s.accuracy
                existing.avg_reaction_time_ms = s.avg_reaction_time_ms
                existing.hints_used = s.hints_used
                existing.completion_status = s.completion_status
                duplicates += 1
            else:
                new_session = GameSession(
                    id=s.local_id,
                    patient_id=patient_id,
                    game_type=s.game_type,
                    difficulty_level=s.difficulty_level,
                    accuracy=s.accuracy,
                    avg_reaction_time_ms=s.avg_reaction_time_ms,
                    hints_used=s.hints_used,
                    rounds_completed=s.rounds_completed,
                    completion_status=s.completion_status,
                    started_at=s.started_at,
                    ended_at=s.ended_at,
                    device_info=s.device_info,
                    extended_telemetry=json.dumps(s.model_extra) if s.model_extra else None,
                    ingested_at=datetime.utcnow()
                )
                db.add(new_session)
                ingested += 1
                
        patient.last_synced_at = datetime.utcnow()
        db.commit()
        
        # Trigger daily score aggregation for the session dates
        dates_to_aggregate = set([s.started_at.date() for s in sessions])
        for d in dates_to_aggregate:
            ClinicalCognitiveAnalytics.aggregate_daily_scores(db, patient_id, d)
            
        # Run real-time clinical alert rules
        alert_engine.evaluate_clinical_alerts(db, patient_id)
        
        return ingested, duplicates

    @classmethod
    def ingest_task_logs_batch(cls, db: Session, patient_id: str, tasks: List[TaskLogSyncItem]) -> Tuple[int, int]:
        ingested = 0
        duplicates = 0
        
        for t in tasks:
            existing = db.query(TaskLog).filter(TaskLog.id == t.local_id).first()
            if existing:
                existing.status = t.status
                existing.completed_time = t.completed_time
                existing.notes = t.notes
                duplicates += 1
            else:
                new_task = TaskLog(
                    id=t.local_id,
                    patient_id=patient_id,
                    task_type=t.task_type,
                    title=t.title or t.task_type.capitalize(),
                    scheduled_time=t.scheduled_time,
                    completed_time=t.completed_time,
                    status=t.status,
                    notes=t.notes,
                    ingested_at=datetime.utcnow()
                )
                db.add(new_task)
                ingested += 1
                
        db.commit()
        alert_engine.evaluate_clinical_alerts(db, patient_id)
        return ingested, duplicates

    @classmethod
    def ingest_mood_logs_batch(cls, db: Session, patient_id: str, moods: List[MoodLogSyncItem]) -> Tuple[int, int]:
        ingested = 0
        duplicates = 0
        
        for m in moods:
            existing = db.query(MoodLog).filter(MoodLog.id == m.local_id).first()
            if existing:
                existing.mood_score = m.mood_score
                existing.notes = m.notes
                duplicates += 1
            else:
                new_mood = MoodLog(
                    id=m.local_id,
                    patient_id=patient_id,
                    mood_score=m.mood_score,
                    logged_at=m.logged_at,
                    notes=m.notes,
                    ingested_at=datetime.utcnow()
                )
                db.add(new_mood)
                ingested += 1
                
        db.commit()
        alert_engine.evaluate_clinical_alerts(db, patient_id)
        return ingested, duplicates

    @classmethod
    def to_fhir_medication_statement(cls, task: TaskLog, patient: Patient) -> Dict[str, Any]:
        """
        Converts TaskLog medication record into standard HL7 FHIR MedicationStatement resource.
        """
        return {
            "resourceType": "MedicationStatement",
            "id": f"medstmt-{task.id}",
            "status": "completed" if task.status == "done" else "not-done",
            "category": {
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/medication-statement-category",
                    "code": "community",
                    "display": "Community / Home Care"
                }]
            },
            "medicationCodeableConcept": {
                "text": task.title
            },
            "subject": {
                "reference": f"Patient/{patient.id}",
                "display": patient.name
            },
            "effectiveDateTime": (task.completed_time or task.scheduled_time or datetime.utcnow()).isoformat(),
            "dateAsserted": datetime.utcnow().isoformat(),
            "note": [{
                "text": task.notes or "Routine daily adherence logged via patient tablet."
            }],
            "meta": {
                "profile": ["http://hl7.org/fhir/StructureDefinition/MedicationStatement"],
                "source": "urn:antigravity:ps26003:ner-patient-app"
            }
        }

    @classmethod
    def generate_delta_pull(cls, db: Session, patient_id: str, since: datetime = None) -> Dict[str, Any]:
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            return {"error": "Patient not found"}
            
        reminders_query = db.query(Reminder).filter(Reminder.patient_id == patient_id, Reminder.active == True)
        if since:
            reminders_query = reminders_query.filter(Reminder.updated_at >= since)
        reminders = reminders_query.all()
        
        dda_cfg = db.query(DDAConfig).filter(DDAConfig.patient_id == patient_id).first()
        dda_dict = {
            "w1_accuracy": dda_cfg.w1_accuracy if dda_cfg else 0.50,
            "w2_speed": dda_cfg.w2_speed if dda_cfg else 0.30,
            "w3_hints": dda_cfg.w3_hints if dda_cfg else 0.20,
            "threshold_up": dda_cfg.threshold_up if dda_cfg else 0.75,
            "threshold_down": dda_cfg.threshold_down if dda_cfg else 0.45,
            "current_difficulty_memory": dda_cfg.current_difficulty_memory if dda_cfg else 2,
            "current_difficulty_attention": dda_cfg.current_difficulty_attention if dda_cfg else 2,
            "current_difficulty_sequencing": dda_cfg.current_difficulty_sequencing if dda_cfg else 2,
            "current_difficulty_pattern": dda_cfg.current_difficulty_pattern if dda_cfg else 2,
        }
        
        reminders_list = [
            {
                "id": r.id,
                "title": r.title,
                "task_type": r.task_type,
                "time_of_day": r.time_of_day,
                "cron_schedule": r.cron_schedule,
                "audio_prompt_key": r.audio_prompt_key,
                "dosage": r.dosage
            }
            for r in reminders
        ]
        
        return {
            "patient_id": patient.id,
            "patient_name": patient.name,
            "preferred_language": patient.preferred_language,
            "dementia_stage": patient.dementia_stage,
            "dda_config": dda_dict,
            "reminders": reminders_list,
            "hlc_timestamp": f"{int(datetime.utcnow().timestamp()*1000)}:1:server-node-1",
            "server_timestamp": datetime.utcnow()
        }

sync_service = BatchSyncService()

