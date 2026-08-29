from fastapi import APIRouter
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.patients import router as patients_router
from backend.app.api.v1.sync import router as sync_router
from backend.app.api.v1.dda import router as dda_router
from backend.app.api.v1.analytics import router as analytics_router
from backend.app.api.v1.alerts import router as alerts_router
from backend.app.api.v1.reports import router as reports_router
from backend.app.api.v1.voice import router as voice_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(patients_router)
api_router.include_router(sync_router)
api_router.include_router(dda_router)
api_router.include_router(analytics_router)
api_router.include_router(alerts_router)
api_router.include_router(reports_router)
api_router.include_router(voice_router)
