from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from typing import Optional

from backend.app.core.database import get_db
from backend.app.models.patient import Patient
from backend.app.models.cognitive import CognitiveScore
from backend.app.models.session import GameSession
from backend.app.models.task import TaskLog
from backend.app.schemas.analytics_schemas import CognitiveTrendsResponse, PatientCognitiveProfileResponse, RadarDomainProfile
from backend.app.services.analytics_service import ClinicalCognitiveAnalytics
from backend.app.services.anomaly_detector import anomaly_detector

router = APIRouter(prefix="/analytics", tags=["Clinical Analytics & Trends"])

@router.get("/{patient_id}/trends", response_model=CognitiveTrendsResponse)
def get_cognitive_trends(patient_id: str, range_days: int = Query(30, ge=7, le=180), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
        
    since_date = date.today() - timedelta(days=range_days)
    scores = db.query(CognitiveScore).filter(
        CognitiveScore.patient_id == patient_id,
        CognitiveScore.date >= since_date
    ).order_by(CognitiveScore.date.asc()).all()
    
    is_drop, pct_drop, diag = anomaly_detector.evaluate_patient_trajectory(db, patient_id)
    
    latest = scores[-1] if scores else None
    
    data_points = [
        {
            "date": s.date,
            "memory_score": s.memory_score,
            "attention_score": s.attention_score,
            "sequencing_score": s.sequencing_score,
            "pattern_score": s.pattern_score,
            "composite_score": s.composite_score,
            "ewma_score": s.ewma_score,
            "moca_equivalent": s.moca_equivalent,
            "mmse_equivalent": s.mmse_equivalent
        }
        for s in scores
    ]
    
    return {
        "patient_id": patient.id,
        "patient_name": patient.name,
        "dementia_stage": patient.dementia_stage,
        "date_range": f"{range_days}d",
        "current_composite_score": latest.composite_score if latest else 70.0,
        "current_moca_equivalent": latest.moca_equivalent if latest else 22.0,
        "current_mmse_equivalent": latest.mmse_equivalent if latest else 25.0,
        "overall_trend": latest.trend_flag if latest else "stable",
        "slope_30d": latest.slope_30d if latest else 0.0,
        "cusum_alert_active": is_drop,
        "data_points": data_points
    }

@router.get("/{patient_id}/cognitive-profile", response_model=PatientCognitiveProfileResponse)
def get_patient_cognitive_profile(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
        
    latest_score = db.query(CognitiveScore).filter(
        CognitiveScore.patient_id == patient_id
    ).order_by(CognitiveScore.date.desc()).first()
    
    total_sessions = db.query(GameSession).filter(GameSession.patient_id == patient_id).count()
    last_sess = db.query(GameSession).filter(GameSession.patient_id == patient_id).order_by(GameSession.started_at.desc()).first()
    
    # 30-day task adherence
    since_30 = datetime.utcnow() - timedelta(days=30)
    tasks = db.query(TaskLog).filter(TaskLog.patient_id == patient_id, TaskLog.scheduled_time >= since_30).all()
    done = len([t for t in tasks if t.status == "done"])
    adherence = round((done / len(tasks) * 100), 1) if tasks else 90.0
    
    mem = latest_score.memory_score if latest_score else 72.0
    att = latest_score.attention_score if latest_score else 75.0
    seq = latest_score.sequencing_score if latest_score else 68.0
    pat = latest_score.pattern_score if latest_score else 70.0
    
    radar_domains = [
        {"domain": "Working Memory", "score": mem, "norm_baseline": 75.0, "stage_benchmark": 65.0},
        {"domain": "Selective Attention", "score": att, "norm_baseline": 78.0, "stage_benchmark": 68.0},
        {"domain": "Executive Sequencing", "score": seq, "norm_baseline": 72.0, "stage_benchmark": 60.0},
        {"domain": "Visuospatial Pattern", "score": pat, "norm_baseline": 74.0, "stage_benchmark": 62.0},
    ]
    
    return {
        "patient_id": patient.id,
        "patient_name": patient.name,
        "age": patient.age,
        "education_years": patient.education_years,
        "region": patient.region,
        "dementia_stage": patient.dementia_stage,
        "radar_domains": radar_domains,
        "adherence_rate_30d": adherence,
        "total_sessions_played": total_sessions,
        "last_active": last_sess.started_at if last_sess else None
    }
