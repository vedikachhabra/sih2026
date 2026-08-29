import os
import sys
import uuid
import random
from datetime import datetime, timedelta, date
import pandas as pd

# Add workspace root to sys.path so backend imports resolve
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if WORKSPACE_ROOT not in sys.path:
    sys.path.insert(0, WORKSPACE_ROOT)

from backend.app.core.database import SessionLocal, Base, engine
from backend.app.core.security import get_password_hash
from backend.app.models.patient import Patient, Caregiver, AuditLog
from backend.app.models.cognitive import CognitiveScore, DDAConfig
from backend.app.models.session import GameSession
from backend.app.models.task import TaskLog, MoodLog, Reminder
from backend.app.models.alert import Alert
from backend.app.services.analytics_service import ClinicalCognitiveAnalytics
from backend.app.services.alert_engine import alert_engine

def load_oasis_benchmarks():
    """
    Parses real OASIS longitudinal dementia dataset from resouces/ to derive
    population parameters for age, education, and MMSE baselines.
    """
    csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../resouces/dementia_dataset.csv"))
    if os.path.exists(csv_path):
        try:
            df = pd.read_csv(csv_path)
            print(f"Ingested OASIS Longitudinal Dataset: {len(df)} records.")
            return df
        except Exception as e:
            print(f"Warning: Could not parse OASIS dataset: {e}")
    return None

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if already seeded
    if db.query(Caregiver).count() > 0:
        print("Database already contains records. Clearing existing records for clean demo seed...")
        db.query(Alert).delete()
        db.query(TaskLog).delete()
        db.query(MoodLog).delete()
        db.query(GameSession).delete()
        db.query(CognitiveScore).delete()
        db.query(DDAConfig).delete()
        db.query(Reminder).delete()
        db.query(Patient).delete()
        db.query(Caregiver).delete()
        db.query(AuditLog).delete()
        db.commit()

    oasis_df = load_oasis_benchmarks()

    print("Seeding Caregivers & Clinicians...")
    dr_barua = Caregiver(
        id=str(uuid.uuid4()),
        name="Dr. S. K. Barua, MD",
        email="dr.barua@gnrc-hospital.in",
        phone="+91-98640-12345",
        role="clinician",
        password_hash=get_password_hash("doctor123")
    )
    family_caregiver = Caregiver(
        id=str(uuid.uuid4()),
        name="Ananya Barua (Family)",
        email="ananya.care@gmail.com",
        phone="+91-94350-98765",
        role="family",
        password_hash=get_password_hash("family123")
    )
    db.add_all([dr_barua, family_caregiver])
    db.commit()

    # 4 Diverse NER Patient Profiles
    patient_configs = [
        {
            "id": "p-assam-001",
            "name": "Priyom Barua",
            "age": 74,
            "gender": "Male",
            "education_years": 10,
            "preferred_language": "as",  # Assamese
            "dementia_stage": "mci",
            "region": "Assam (Guwahati)",
            "caregiver_id": family_caregiver.id,
            "caregiver_name": "Anjali Barua",
            "caregiver_relation": "Daughter",
            "caregiver_phone": "+91 98640-12345",
            "trajectory_type": "stable",
            "base_score": 74.0
        },
        {
            "id": "p-nagaland-002",
            "name": "Rongsen Jamir",
            "age": 78,
            "gender": "Male",
            "education_years": 8,
            "preferred_language": "en",  # English/Nagamese
            "dementia_stage": "mild",
            "region": "Nagaland (Kohima)",
            "caregiver_id": dr_barua.id,
            "caregiver_name": "Sentila Jamir",
            "caregiver_relation": "Daughter",
            "caregiver_phone": "+91 98560-23456",
            "trajectory_type": "decline",  # Drops >15% over last 7 days to trigger CUSUM alert
            "base_score": 68.0
        },
        {
            "id": "p-mizoram-003",
            "name": "Lalrintluanga Sailo",
            "age": 71,
            "gender": "Male",
            "education_years": 12,
            "preferred_language": "lus",  # Mizo
            "dementia_stage": "mci",
            "region": "Mizoram (Aizawl)",
            "caregiver_id": dr_barua.id,
            "caregiver_name": "Zothansanga Sailo",
            "caregiver_relation": "Son",
            "caregiver_phone": "+91 98320-34567",
            "trajectory_type": "improving",
            "base_score": 78.0
        },
        {
            "id": "p-meghalaya-004",
            "name": "Baphaplang Syiem",
            "age": 82,
            "gender": "Female",
            "education_years": 6,
            "preferred_language": "kha",  # Khasi
            "dementia_stage": "moderate",
            "region": "Meghalaya (Shillong)",
            "caregiver_id": dr_barua.id,
            "caregiver_name": "Daphisha Syiem",
            "caregiver_relation": "Nurse / Attendant",
            "caregiver_phone": "+91 98110-45678",
            "trajectory_type": "missed_meds",  # Has missed meds in last 24h
            "base_score": 48.0
        }
    ]

    games = ["memory", "attention", "sequencing", "pattern"]
    now = datetime.utcnow()

    for p_cfg in patient_configs:
        print(f"Generating 30-day clinical longitudinal trajectory for {p_cfg['name']} ({p_cfg['region']})...")
        patient = Patient(
            id=p_cfg["id"],
            name=p_cfg["name"],
            age=p_cfg["age"],
            gender=p_cfg.get("gender", "Male"),
            education_years=p_cfg["education_years"],
            preferred_language=p_cfg["preferred_language"],
            dementia_stage=p_cfg["dementia_stage"],
            region=p_cfg["region"],
            caregiver_id=p_cfg["caregiver_id"],
            caregiver_name=p_cfg.get("caregiver_name", "Anjali Barua"),
            caregiver_relation=p_cfg.get("caregiver_relation", "Daughter"),
            caregiver_phone=p_cfg.get("caregiver_phone", "+91 98640-12345"),
            device_id=f"tab-{p_cfg['id'][:8]}",
            last_synced_at=now - timedelta(minutes=15)
        )
        db.add(patient)
        
        # DDA config
        dda_cfg = DDAConfig(
            patient_id=patient.id,
            current_difficulty_memory=2 if p_cfg["dementia_stage"] == "mci" else 1,
            current_difficulty_attention=2 if p_cfg["dementia_stage"] == "mci" else 1,
            current_difficulty_sequencing=2 if p_cfg["dementia_stage"] == "mci" else 1,
            current_difficulty_pattern=2 if p_cfg["dementia_stage"] == "mci" else 1
        )
        db.add(dda_cfg)
        
        # Reminders
        r1 = Reminder(patient_id=patient.id, title="Morning Medication (Memantine)", task_type="medication", time_of_day="08:00", dosage="10mg", audio_prompt_key="med_morning")
        r2 = Reminder(patient_id=patient.id, title="Afternoon Hydration", task_type="hydration", time_of_day="13:00", dosage="1 Glass", audio_prompt_key="hydration_midday")
        r3 = Reminder(patient_id=patient.id, title="Evening Memory Exercise & Drops", task_type="medication", time_of_day="20:00", dosage="5mg", audio_prompt_key="med_night")
        db.add_all([r1, r2, r3])

        # Generate 30 days of daily sessions, task logs, and mood logs
        for day_offset in range(29, -1, -1):
            cur_date = (now - timedelta(days=day_offset)).date()
            base_score = p_cfg["base_score"]
            
            # Trajectory modulation
            if p_cfg["trajectory_type"] == "decline" and day_offset <= 7:
                # Sudden cognitive drop of 18% over the last 7 days
                drop_factor = (8 - day_offset) * 2.2
                current_score = max(35.0, base_score - drop_factor)
                target_acc = max(0.45, 0.76 - (drop_factor * 0.025))
                target_rt = min(3200, int(1800 + (drop_factor * 120)))
            elif p_cfg["trajectory_type"] == "improving":
                # Gradual improvement of +6 points
                current_score = min(88.0, base_score + (30 - day_offset) * 0.2)
                target_acc = min(0.92, 0.80 + (30 - day_offset) * 0.004)
                target_rt = max(1100, int(1700 - (30 - day_offset) * 15))
            else:
                # Stable with natural daily variance (+/- 3 points)
                current_score = base_score + random.uniform(-2.5, 2.5)
                target_acc = 0.78 + random.uniform(-0.06, 0.06)
                target_rt = 1850 + random.randint(-200, 200)

            # Create 2-3 game sessions per day
            for g in random.sample(games, k=3):
                sess_id = str(uuid.uuid4())
                sess_start = datetime.combine(cur_date, datetime.min.time()) + timedelta(hours=random.randint(9, 18), minutes=random.randint(0, 59))
                sess_end = sess_start + timedelta(minutes=random.randint(3, 7))
                
                sess = GameSession(
                    id=sess_id,
                    patient_id=patient.id,
                    game_type=g,
                    difficulty_level=2 if current_score >= 70 else 1,
                    accuracy=round(float(min(1.0, max(0.3, target_acc + random.uniform(-0.05, 0.05)))), 2),
                    avg_reaction_time_ms=int(target_rt + random.randint(-150, 150)),
                    hints_used=random.choice([0, 1, 1, 2]),
                    rounds_completed=random.randint(1, 3),
                    completion_status="completed",
                    started_at=sess_start,
                    ended_at=sess_end,
                    device_info="Tablet-NER-ModelA",
                    ingested_at=sess_end + timedelta(minutes=2)
                )
                db.add(sess)

            # Daily Task Logs (Meds & Hydration)
            is_missed_today = (p_cfg["trajectory_type"] == "missed_meds" and day_offset <= 1)
            t1 = TaskLog(
                id=str(uuid.uuid4()),
                patient_id=patient.id,
                task_type="medication",
                title="Morning Medication",
                scheduled_time=datetime.combine(cur_date, datetime.min.time()) + timedelta(hours=8),
                completed_time=None if is_missed_today else (datetime.combine(cur_date, datetime.min.time()) + timedelta(hours=8, minutes=15)),
                status="missed" if is_missed_today else "done"
            )
            t2 = TaskLog(
                id=str(uuid.uuid4()),
                patient_id=patient.id,
                task_type="hydration",
                title="Afternoon Hydration",
                scheduled_time=datetime.combine(cur_date, datetime.min.time()) + timedelta(hours=13),
                completed_time=datetime.combine(cur_date, datetime.min.time()) + timedelta(hours=13, minutes=20),
                status="done"
            )
            t3 = TaskLog(
                id=str(uuid.uuid4()),
                patient_id=patient.id,
                task_type="medication",
                title="Evening Medication",
                scheduled_time=datetime.combine(cur_date, datetime.min.time()) + timedelta(hours=20),
                completed_time=None if is_missed_today else (datetime.combine(cur_date, datetime.min.time()) + timedelta(hours=20, minutes=10)),
                status="missed" if is_missed_today else "done"
            )
            db.add_all([t1, t2, t3])

            # Daily Mood Log
            mood_val = 2 if (p_cfg["trajectory_type"] == "decline" and day_offset <= 3) else random.choice([3, 4, 4, 5])
            m_log = MoodLog(
                id=str(uuid.uuid4()),
                patient_id=patient.id,
                mood_score=mood_val,
                logged_at=datetime.combine(cur_date, datetime.min.time()) + timedelta(hours=19),
                notes="Felt good during tea time." if mood_val >= 4 else "Reported feeling slightly tired."
            )
            db.add(m_log)

            db.commit()

            # Aggregate daily cognitive score record
            ClinicalCognitiveAnalytics.aggregate_daily_scores(db, patient.id, cur_date)

        # Run alert evaluations after full history loaded
        alert_engine.evaluate_clinical_alerts(db, patient.id)

    db.commit()
    print("Database seeding completed successfully!")
    print(f"Total Patients: {db.query(Patient).count()}")
    print(f"Total Game Sessions: {db.query(GameSession).count()}")
    print(f"Total Daily Cognitive Scores: {db.query(CognitiveScore).count()}")
    print(f"Total Clinical Alerts: {db.query(Alert).count()}")
    db.close()

if __name__ == "__main__":
    seed_database()
