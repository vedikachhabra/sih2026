import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert "North Eastern Region" in response.json()["region_focus"]

def test_list_patients_endpoint():
    response = client.get("/api/v1/patients")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 4

def test_cognitive_trends_endpoint():
    response = client.get("/api/v1/analytics/p-assam-001/trends?range_days=30")
    assert response.status_code == 200
    data = response.json()
    assert data["patient_name"] == "Priyom Barua"
    assert len(data["data_points"]) >= 20

def test_alerts_endpoint():
    response = client.get("/api/v1/alerts")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1

def test_pdf_report_export_endpoint():
    response = client.get("/api/v1/reports/p-assam-001/export?range_days=30")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert len(response.content) > 1000
