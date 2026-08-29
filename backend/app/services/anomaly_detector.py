from typing import List, Tuple, Optional, Dict
import numpy as np
from sqlalchemy.orm import Session
from datetime import date, timedelta

from backend.app.core.config import settings
from backend.app.models.cognitive import CognitiveScore
from backend.app.models.alert import Alert

class TwoStageCUSUMDetector:
    """
    Two-Stage Cognitive Decline Anomaly Detector:
    Stage 1: EWMA Smoothing (lambda = 0.25) to filter transient daily fatigue/noise.
    Stage 2: Tabular CUSUM (Cumulative Sum) on EWMA residuals to detect sustained
             clinically significant cognitive drops (>15% over 7-14 days).
             
    Reference:
    - arXiv:2511.16445: CUSUM delivers F1 > 0.98 in dementia monitoring anomaly detection.
    - BMC Medical Research Methodology (2007) 7:46: CUSUM surveillance for clinical deterioration.
    """
    
    def __init__(self, ewma_lambda: float = 0.25, k: float = 0.5, h: float = 3.5):
        self.ewma_lambda = ewma_lambda
        self.k = k  # Allowance / slack parameter in standard deviation units
        self.h = h  # Decision threshold in standard deviation units

    def evaluate_patient_trajectory(self, db: Session, patient_id: str) -> Tuple[bool, float, Dict]:
        """
        Evaluates the last 14-30 days of cognitive scores for a patient.
        Returns: (alert_triggered, percentage_drop, diagnostics)
        """
        records = db.query(CognitiveScore).filter(
            CognitiveScore.patient_id == patient_id
        ).order_by(CognitiveScore.date.asc()).all()
        
        if len(records) < 5:
            # Need at least 5 days of history for reliable baseline
            return False, 0.0, {"status": "insufficient_history", "record_count": len(records)}
            
        scores = [r.composite_score for r in records]
        
        # Calculate baseline from first 5-10 records (pre-event normal state)
        baseline_n = min(10, max(5, len(records) // 2))
        baseline_mean = float(np.mean(scores[:baseline_n]))
        baseline_sd = float(np.std(scores[:baseline_n]))
        if baseline_sd < 2.0:
            baseline_sd = 2.0  # Prevent division by zero / extreme sensitivity
            
        # Stage 1: Compute EWMA series
        ewma_series = []
        curr_ewma = baseline_mean
        for score in scores:
            curr_ewma = self.ewma_lambda * score + (1.0 - self.ewma_lambda) * curr_ewma
            ewma_series.append(curr_ewma)
            
        # Stage 2: Tabular CUSUM for negative drift (cognitive decline)
        # S_low[t] = max(0, S_low[t-1] - (Z_t + k)) where Z_t = (EWMA_t - baseline_mean) / baseline_sd
        s_low = 0.0
        cusum_history = []
        alert_triggered = False
        
        for ewma_val in ewma_series:
            z_t = (ewma_val - baseline_mean) / baseline_sd
            # Since decline is negative z_t, we accumulate (-z_t - k)
            s_low = max(0.0, s_low + (-z_t - self.k))
            cusum_history.append(round(s_low, 2))
            if s_low >= self.h:
                alert_triggered = True
                
        # Calculate percentage drop from baseline to current EWMA
        latest_ewma = ewma_series[-1]
        pct_drop = 0.0
        if baseline_mean > 0:
            pct_drop = ((baseline_mean - latest_ewma) / baseline_mean) * 100.0
            
        # Check if drop exceeds clinical 15% threshold
        is_significant_drop = pct_drop >= 15.0 and alert_triggered
        
        diagnostics = {
            "baseline_mean": round(baseline_mean, 2),
            "latest_ewma": round(latest_ewma, 2),
            "percentage_drop": round(pct_drop, 2),
            "final_cusum_statistic": round(s_low, 2),
            "threshold_h": self.h,
            "cusum_breached": alert_triggered,
            "is_significant_drop": is_significant_drop
        }
        
        # Update latest record with cusum stat
        if records:
            records[-1].cusum_statistic = round(s_low, 2)
            db.commit()
            
        return is_significant_drop, pct_drop, diagnostics

anomaly_detector = TwoStageCUSUMDetector()
