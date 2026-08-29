from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from backend.app.core.database import get_db
from backend.app.models.alert import Alert
from backend.app.models.patient import Patient
from backend.app.schemas.alert_schemas import AlertResponse, AcknowledgeAlertRequest

router = APIRouter(prefix="/alerts", tags=["Clinical Alerts & Anomaly Center"])

@router.get("", response_model=List[AlertResponse])
def list_alerts(patient_id: Optional[str] = None, severity: Optional[str] = None, unacknowledged_only: bool = False, db: Session = Depends(get_db)):
    query = db.query(Alert)
    if patient_id:
        query = query.filter(Alert.patient_id == patient_id)
    if severity:
        query = query.filter(Alert.severity == severity.lower())
    if unacknowledged_only:
        query = query.filter(Alert.acknowledged == False)
        
    alerts = query.order_by(Alert.created_at.desc()).all()
    
    result = []
    for a in alerts:
        p = db.query(Patient).filter(Patient.id == a.patient_id).first()
        res = AlertResponse.from_orm(a)
        if p:
            res.patient_name = p.name
            res.patient_region = p.region
        result.append(res)
        
    return result

@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(alert_id: str, payload: AcknowledgeAlertRequest, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
        
    alert.acknowledged = True
    alert.acknowledged_by = payload.acknowledged_by
    alert.acknowledged_at = datetime.utcnow()
    alert.action_taken = payload.action_taken
    
    db.commit()
    db.refresh(alert)
    return alert
