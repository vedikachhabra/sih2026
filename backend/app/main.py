from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.database import Base, engine
from backend.app.api.v1 import api_router

from sqlalchemy import text

# Create database tables automatically on startup
Base.metadata.create_all(bind=engine)

# Safely verify/add new columns in SQLite database if not present
with engine.connect() as conn:
    for col, col_type in [
        ("gender", "VARCHAR(20) DEFAULT 'Male'"),
        ("caregiver_name", "VARCHAR(100) DEFAULT 'Anjali Barua'"),
        ("caregiver_relation", "VARCHAR(50) DEFAULT 'Daughter'"),
        ("caregiver_phone", "VARCHAR(50) DEFAULT '+91 98640-12345'"),
        ("baseline_mmse", "FLOAT DEFAULT 24.0"),
        ("baseline_moca", "FLOAT DEFAULT 22.0")
    ]:
        try:
            conn.execute(text(f"ALTER TABLE patients ADD COLUMN {col} {col_type}"))
            conn.commit()
        except Exception:
            pass  # Column already exists

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Based Cognitive Gaming & Memory Assistance Platform for Elderly Dementia Patients (NER)",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for Web Portal & Mobile/PWA client connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "region_focus": "North Eastern Region (NER), India",
        "api_docs": "/docs",
        "compliance": ["DPDP Act 2023", "Mental Healthcare Act 2017", "FHIR LOINC 72172-0"]
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "cognitive-care-backend"}
