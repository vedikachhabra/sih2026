from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime

from backend.app.core.database import get_db
from backend.app.services.report_generator import report_generator

router = APIRouter(prefix="/reports", tags=["Clinical Reports & DPDP Export"])

@router.get("/{patient_id}/export")
def export_clinical_report_pdf(patient_id: str, range_days: int = Query(30, ge=7, le=90), db: Session = Depends(get_db)):
    """
    Generates and streams a high-resolution, FHIR LOINC 72172-0 & DPDP Act 2023 compliant
    Clinical Assessment PDF report.
    """
    try:
        pdf_buffer = report_generator.generate_pdf(db=db, patient_id=patient_id, days_range=range_days)
        filename = f"Clinical_Cognitive_Report_{patient_id[:8]}_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate clinical PDF: {str(e)}")
