import pytest
from backend.app.services.analytics_service import ClinicalCognitiveAnalytics

def test_session_score_calculation():
    # Test average population performance
    score = ClinicalCognitiveAnalytics.calculate_session_score(
        accuracy=0.78,
        reaction_time_ms=1850,
        hints_used=1,
        education_years=14
    )
    # Average performance should map to ~50 T-score, rescaled to ~50 on 0-100 scale
    assert 45.0 <= score <= 55.0

def test_high_performance_score():
    # 98% accuracy, 900ms reaction time, 0 hints -> High score
    score = ClinicalCognitiveAnalytics.calculate_session_score(
        accuracy=0.98,
        reaction_time_ms=900,
        hints_used=0,
        education_years=14
    )
    assert score >= 70.0

def test_low_performance_score():
    # 40% accuracy, 3200ms reaction time, 3 hints -> Low score
    score = ClinicalCognitiveAnalytics.calculate_session_score(
        accuracy=0.40,
        reaction_time_ms=3200,
        hints_used=3,
        education_years=14
    )
    assert score <= 35.0

def test_education_adjustment():
    # Patient with <=12 years education receives +2 point adjustment
    score_low_edu = ClinicalCognitiveAnalytics.calculate_session_score(
        accuracy=0.80,
        reaction_time_ms=1700,
        hints_used=1,
        education_years=8
    )
    score_high_edu = ClinicalCognitiveAnalytics.calculate_session_score(
        accuracy=0.80,
        reaction_time_ms=1700,
        hints_used=1,
        education_years=16
    )
    assert score_low_edu == round(score_high_edu + 2.0, 2)

def test_moca_mmse_stage_mapping():
    # Score 85 -> Normal
    moca, mmse, stage = ClinicalCognitiveAnalytics.map_to_clinical_scale(85.0, education_years=14)
    assert stage == "Normal"
    assert moca >= 25.5
    
    # Score 70 -> MCI
    moca, mmse, stage = ClinicalCognitiveAnalytics.map_to_clinical_scale(70.0, education_years=14)
    assert "MCI" in stage
    assert 18.0 <= moca <= 25.0
    
    # Score 45 -> Mild Dementia
    moca, mmse, stage = ClinicalCognitiveAnalytics.map_to_clinical_scale(45.0, education_years=14)
    assert stage == "Mild Dementia"
    assert 10.0 <= moca < 18.0
    
    # Score 20 -> Moderate / Severe
    moca, mmse, stage = ClinicalCognitiveAnalytics.map_to_clinical_scale(20.0, education_years=14)
    assert "Moderate" in stage
    assert moca < 10.0
