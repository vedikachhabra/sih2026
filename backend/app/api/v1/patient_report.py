from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from backend.app.core.database import get_db
from backend.app.models.patient import Patient
from backend.app.models.session import GameSession

router = APIRouter(prefix="/patient_report", tags=["reports"])

@router.get("/{patient_id}")
def get_patient_report(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    sessions = db.query(GameSession).filter(GameSession.patient_id == patient_id).order_by(GameSession.started_at.asc()).all()
    
    # Calculate some basic behavioral indicators
    total_sessions = len(sessions)
    if total_sessions == 0:
        return {
            "patient_id": patient_id,
            "message": "No game data available to generate a report."
        }
        
    # Analyze trends
    recent_sessions = sessions[-5:] # last 5 sessions
    
    avg_accuracy = sum(s.accuracy or 0 for s in recent_sessions) / len(recent_sessions) if recent_sessions else 0
    avg_hints = sum(s.hints_used or 0 for s in recent_sessions) / len(recent_sessions) if recent_sessions else 0
    
    report = {
        "disclaimer": "Game-derived behavioral indicators - not clinical diagnoses.",
        "patient_name": patient.name,
        "total_sessions": total_sessions,
        "indicators": {
            "memory": "Stable" if avg_accuracy > 0.7 else "Needs Support",
            "planning": "Good" if avg_hints < 3 else "High hint reliance",
            "interaction": "Engaged"
        },
        "recent_metrics": {
            "average_accuracy": avg_accuracy,
            "average_hints_used": avg_hints
        }
    }
    
    return report
