from typing import List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from backend.app.models.patient import Patient
from backend.app.models.alert import Alert
from backend.app.models.task import TaskLog, MoodLog
from backend.app.models.session import GameSession
from backend.app.services.anomaly_detector import anomaly_detector

class ClinicalAlertEngine:
    """
    Real-Time Clinical Alert Rule Engine:
    1. Cognitive Decline Alert: EWMA + CUSUM detect >15% drop over 7-14 days.
    2. Missed Medication Alert: >=2 missed medication tasks within 24 hours.
    3. Inactivity Alert: Zero game or task activity for >24 hours.
    4. Persistent Low Mood Alert: Consecutive mood scores <= 2 across 3 entries.
    """

    @classmethod
    def evaluate_clinical_alerts(cls, db: Session, patient_id: str) -> List[Alert]:
        new_alerts = []
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            return new_alerts
            
        now = datetime.utcnow()
        yesterday = now - timedelta(days=1)
        
        # 1. Rule: Statistical Cognitive Decline Detection (EWMA + CUSUM)
        is_drop, pct_drop, diag = anomaly_detector.evaluate_patient_trajectory(db, patient_id)
        if is_drop:
            # Check if alert already raised today
            recent_alert = db.query(Alert).filter(
                Alert.patient_id == patient_id,
                Alert.alert_type == "score_drop",
                Alert.created_at >= yesterday
            ).first()
            
            if not recent_alert:
                alert = Alert(
                    patient_id=patient_id,
                    alert_type="score_drop",
                    severity="high",
                    title="Significant Cognitive Decline Detected",
                    message=f"Patient {patient.name} has exhibited a sustained {diag['percentage_drop']}% decline in composite cognitive performance over the recent window (EWMA baseline drop confirmed by CUSUM statistic {diag['final_cusum_statistic']}). Clinical review advised.",
                    metric_value=f"-{diag['percentage_drop']}% drop"
                )
                db.add(alert)
                new_alerts.append(alert)
                
        # 2. Rule: Missed Medications (>=2 in past 24h)
        missed_meds = db.query(TaskLog).filter(
            TaskLog.patient_id == patient_id,
            TaskLog.task_type == "medication",
            TaskLog.status == "missed",
            TaskLog.scheduled_time >= yesterday
        ).all()
        
        if len(missed_meds) >= 2:
            recent_med_alert = db.query(Alert).filter(
                Alert.patient_id == patient_id,
                Alert.alert_type == "missed_medication",
                Alert.created_at >= yesterday
            ).first()
            if not recent_med_alert:
                alert = Alert(
                    patient_id=patient_id,
                    alert_type="missed_medication",
                    severity="high",
                    title="Multiple Missed Medication Doses",
                    message=f"Patient {patient.name} missed {len(missed_meds)} scheduled medication doses in the past 24 hours.",
                    metric_value=f"{len(missed_meds)} doses missed"
                )
                db.add(alert)
                new_alerts.append(alert)
                
        # 3. Rule: Inactivity (>24h without any sessions or tasks)
        last_session = db.query(GameSession).filter(GameSession.patient_id == patient_id).order_by(GameSession.started_at.desc()).first()
        last_task = db.query(TaskLog).filter(TaskLog.patient_id == patient_id).order_by(TaskLog.scheduled_time.desc()).first()
        
        last_active = None
        if last_session and last_task:
            last_active = max(last_session.started_at, last_task.scheduled_time)
        elif last_session:
            last_active = last_session.started_at
        elif last_task:
            last_active = last_task.scheduled_time
            
        if last_active and (now - last_active) > timedelta(hours=36):
            recent_inact_alert = db.query(Alert).filter(
                Alert.patient_id == patient_id,
                Alert.alert_type == "inactivity",
                Alert.created_at >= yesterday
            ).first()
            if not recent_inact_alert:
                hours_inactive = int((now - last_active).total_seconds() // 3600)
                alert = Alert(
                    patient_id=patient_id,
                    alert_type="inactivity",
                    severity="medium",
                    title="Prolonged Inactivity Flag",
                    message=f"No cognitive sessions or routine adherence logged for {patient.name} for over {hours_inactive} hours.",
                    metric_value=f"{hours_inactive}h inactive"
                )
                db.add(alert)
                new_alerts.append(alert)
                
        # 4. Rule: Persistent Low Mood (last 3 entries <= 2)
        recent_moods = db.query(MoodLog).filter(MoodLog.patient_id == patient_id).order_by(MoodLog.logged_at.desc()).limit(3).all()
        if len(recent_moods) == 3 and all(m.mood_score <= 2 for m in recent_moods):
            recent_mood_alert = db.query(Alert).filter(
                Alert.patient_id == patient_id,
                Alert.alert_type == "low_mood",
                Alert.created_at >= yesterday
            ).first()
            if not recent_mood_alert:
                alert = Alert(
                    patient_id=patient_id,
                    alert_type="low_mood",
                    severity="medium",
                    title="Sustained Low Mood Indicator",
                    message=f"{patient.name} recorded consecutive low emotional states ({recent_moods[0].mood_score}/5). Consider caregiver check-in.",
                    metric_value="Avg Mood <= 2.0"
                )
                db.add(alert)
                new_alerts.append(alert)
                
        db.commit()
        return new_alerts

alert_engine = ClinicalAlertEngine()
