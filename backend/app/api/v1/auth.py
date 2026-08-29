from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from backend.app.core.database import get_db
from backend.app.core.security import verify_password, get_password_hash, create_access_token
from backend.app.models.patient import Caregiver, Patient
from backend.app.schemas.patient_schemas import CaregiverCreate, CaregiverResponse, LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])

@router.post("/register", response_model=CaregiverResponse)
def register_caregiver(payload: CaregiverCreate, db: Session = Depends(get_db)):
    existing = db.query(Caregiver).filter(Caregiver.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Caregiver with this email already registered.")
        
    caregiver = Caregiver(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        role=payload.role,
        password_hash=get_password_hash(payload.password)
    )
    db.add(caregiver)
    db.commit()
    db.refresh(caregiver)
    return caregiver

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    caregiver = db.query(Caregiver).filter(Caregiver.email == payload.email).first()
    if not caregiver or not verify_password(payload.password, caregiver.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
        
    token = create_access_token(subject=caregiver.id, role=caregiver.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": caregiver
    }

@router.post("/device-provision")
def provision_patient_device(device_id: str, patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
        
    patient.device_id = device_id
    db.commit()
    device_token = create_access_token(subject=patient.id, role="patient_device")
    return {
        "status": "provisioned",
        "device_token": device_token,
        "patient_id": patient.id,
        "preferred_language": patient.preferred_language
    }
