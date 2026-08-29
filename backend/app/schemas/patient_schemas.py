from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CaregiverBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    role: str = "family"  # 'family', 'clinician', 'health_worker'

class CaregiverCreate(CaregiverBase):
    password: str

class CaregiverResponse(CaregiverBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

class PatientBase(BaseModel):
    name: str
    dob: Optional[str] = None
    age: int = 72
    gender: str = "Male"
    education_years: int = 10
    preferred_language: str = "as"  # 'as', 'bn', 'mni', 'kha', 'lus', 'hi', 'en'
    dementia_stage: str = "MCI"
    region: str = "Assam (Guwahati)"
    caregiver_name: Optional[str] = "Anjali Barua"
    caregiver_relation: Optional[str] = "Daughter"
    caregiver_phone: Optional[str] = "+91 98640-12345"
    device_id: Optional[str] = None
    baseline_mmse: Optional[float] = 24.0
    baseline_moca: Optional[float] = 22.0

class PatientCreate(PatientBase):
    id: Optional[str] = None
    caregiver_id: Optional[str] = None

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    preferred_language: Optional[str] = None
    dementia_stage: Optional[str] = None
    education_years: Optional[int] = None
    region: Optional[str] = None
    caregiver_id: Optional[str] = None
    caregiver_name: Optional[str] = None
    caregiver_relation: Optional[str] = None
    caregiver_phone: Optional[str] = None
    baseline_mmse: Optional[float] = None
    baseline_moca: Optional[float] = None

class PatientResponse(PatientBase):
    id: str
    caregiver_id: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: CaregiverResponse
