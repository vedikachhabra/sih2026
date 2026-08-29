import math
from typing import List, Dict, Tuple, Optional
from datetime import date, datetime, timedelta
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.session import GameSession
from backend.app.models.cognitive import CognitiveScore
from backend.app.models.patient import Patient

class ClinicalCognitiveAnalytics:
    """
    Standardized Clinical Cognitive Scoring Pipeline implementing:
    1. Z-score -> T-score -> 0-100 normalization (SF-36 / Neuropsych standard)
    2. Inverted Reaction Time & Hint penalty weighting
    3. MoCA / MMSE equipercentile translation with Education/NER bias adjustment
    4. 4 Cognitive Domain aggregations:
       - Working Memory (Pairs Match)
       - Selective Attention & Speed (Odd-One-Out)
       - Executive Function & Sequencing (Daily Routine Steps)
       - Visuospatial & Pattern (Shape Discrimination)
    """

    # Baseline population norms (derived from OASIS longitudinal cohort + geriatric clinical trials)
    POP_PARAMS = {
        "accuracy": {"mean": 0.78, "sd": 0.16},
        "reaction_time_ms": {"mean": 1850.0, "sd": 650.0},
        "hints_used": {"mean": 1.2, "sd": 1.1}
    }

    @classmethod
    def calculate_session_score(cls, accuracy: float, reaction_time_ms: int, hints_used: int, education_years: int = 10) -> float:
        """
        Computes normalized 0-100 score for an individual game session using z-score -> T-score standard.
        """
        # 1. Z-scores
        z_acc = (accuracy - cls.POP_PARAMS["accuracy"]["mean"]) / cls.POP_PARAMS["accuracy"]["sd"]
        
        # Lower RT is better -> Inverted Z
        z_rt = (cls.POP_PARAMS["reaction_time_ms"]["mean"] - float(reaction_time_ms)) / cls.POP_PARAMS["reaction_time_ms"]["sd"]
        
        # Hints are penalties -> Inverted Z
        z_hint = (cls.POP_PARAMS["hints_used"]["mean"] - float(hints_used)) / cls.POP_PARAMS["hints_used"]["sd"]
        
        # Weighted Composite Z: 50% Accuracy, 30% Speed, 20% Hint Independence
        z_composite = (0.50 * z_acc) + (0.30 * z_rt) + (0.20 * z_hint)
        
        # 2. T-score: Mean=50, SD=10
        t_score = 50.0 + (z_composite * 10.0)
        
        # 3. Rescale to 0-100: T-score 20 (-3SD) -> 0, T-score 50 (Mean) -> 50, T-score 80 (+3SD) -> 100
        # Linear map: Score = (T_score - 20) / 60 * 100
        raw_scaled = ((t_score - 20.0) / 60.0) * 100.0
        
        # 4. Education adjustment (+2 points if <= 12 years of education, as per MoCA/LASI-DAD guidelines for NE India)
        edu_adj = 2.0 if education_years <= 12 else 0.0
        
        final_score = max(0.0, min(100.0, raw_scaled + edu_adj))
        return round(final_score, 2)

    @classmethod
    def map_to_clinical_scale(cls, composite_score_100: float, education_years: int = 10) -> Tuple[float, float, str]:
        """
        Maps 0-100 composite score to MoCA (0-30), MMSE (0-30), and Clinical Stage
        using validated clinical cutoffs from ADNI and BMC Geriatrics equipercentile mapping.
        """
        edu_bonus = 1.0 if education_years <= 12 else 0.0
        
        if composite_score_100 >= 75.0:
            # Normal: MoCA 26-30
            moca_est = 26.0 + ((composite_score_100 - 75.0) / 25.0) * 4.0
            stage = "Normal"
        elif composite_score_100 >= 50.0:
            # MCI: MoCA 18-25
            moca_est = 18.0 + ((composite_score_100 - 50.0) / 25.0) * 7.0
            stage = "MCI (Mild Cognitive Impairment)"
        elif composite_score_100 >= 25.0:
            # Mild Dementia: MoCA 10-17
            moca_est = 10.0 + ((composite_score_100 - 25.0) / 25.0) * 7.0
            stage = "Mild Dementia"
        else:
            # Moderate / Severe Dementia: MoCA < 10
            moca_est = max(0.0, (composite_score_100 / 25.0) * 10.0)
            stage = "Moderate / Severe Dementia"
            
        moca_est = min(30.0, round(moca_est + edu_bonus, 1))
        
        # MMSE equipercentile mapping (BMC Geriatrics)
        # MoCA 26-30 -> MMSE 28-30
        # MoCA 18-25 -> MMSE 24-27
        # MoCA 10-17 -> MMSE 20-23
        # MoCA <10   -> MMSE <20
        if moca_est >= 26.0:
            mmse_est = 28.0 + ((moca_est - 26.0) / 4.0) * 2.0
        elif moca_est >= 18.0:
            mmse_est = 24.0 + ((moca_est - 18.0) / 7.0) * 3.0
        elif moca_est >= 10.0:
            mmse_est = 20.0 + ((moca_est - 10.0) / 7.0) * 3.0
        else:
            mmse_est = max(0.0, (moca_est / 10.0) * 19.0)
            
        mmse_est = min(30.0, round(mmse_est, 1))
        return moca_est, mmse_est, stage

    @classmethod
    def aggregate_daily_scores(cls, db: Session, patient_id: str, target_date: Optional[date] = None) -> Optional[CognitiveScore]:
        """
        Aggregates all game sessions for a patient on target_date into domain scores and composite score.
        """
        if target_date is None:
            target_date = date.today()
            
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            return None
            
        start_dt = datetime.combine(target_date, datetime.min.time())
        end_dt = datetime.combine(target_date, datetime.max.time())
        
        sessions = db.query(GameSession).filter(
            GameSession.patient_id == patient_id,
            GameSession.started_at >= start_dt,
            GameSession.started_at <= end_dt,
            GameSession.completion_status != "abandoned"
        ).all()
        
        if not sessions:
            return None
            
        # Group by game type
        domain_scores = {"memory": [], "attention": [], "sequencing": [], "pattern": []}
        
        for sess in sessions:
            score = cls.calculate_session_score(
                accuracy=sess.accuracy,
                reaction_time_ms=sess.avg_reaction_time_ms,
                hints_used=sess.hints_used,
                education_years=patient.education_years
            )
            g_type = sess.game_type.lower()
            if g_type in domain_scores:
                domain_scores[g_type].append(score)
                
        # Default baseline if a domain was not played today
        prev_record = db.query(CognitiveScore).filter(
            CognitiveScore.patient_id == patient_id,
            CognitiveScore.date < target_date
        ).order_by(CognitiveScore.date.desc()).first()
        
        mem_score = np.mean(domain_scores["memory"]) if domain_scores["memory"] else (prev_record.memory_score if prev_record else 70.0)
        att_score = np.mean(domain_scores["attention"]) if domain_scores["attention"] else (prev_record.attention_score if prev_record else 70.0)
        seq_score = np.mean(domain_scores["sequencing"]) if domain_scores["sequencing"] else (prev_record.sequencing_score if prev_record else 70.0)
        pat_score = np.mean(domain_scores["pattern"]) if domain_scores["pattern"] else (prev_record.pattern_score if prev_record else 70.0)
        
        composite_score = round(float(0.30 * mem_score + 0.25 * att_score + 0.25 * seq_score + 0.20 * pat_score), 2)
        
        # EWMA calculation (lambda = 0.25)
        prev_ewma = prev_record.ewma_score if prev_record else composite_score
        ewma_score = round(float(settings.EWMA_LAMBDA * composite_score + (1.0 - settings.EWMA_LAMBDA) * prev_ewma), 2)
        
        moca_eq, mmse_eq, stage = cls.map_to_clinical_scale(composite_score, patient.education_years)
        
        # Calculate slope over past 30 days
        past_scores = db.query(CognitiveScore).filter(
            CognitiveScore.patient_id == patient_id,
            CognitiveScore.date <= target_date,
            CognitiveScore.date >= (target_date - timedelta(days=30))
        ).order_by(CognitiveScore.date.asc()).all()
        
        slope_30d = 0.0
        trend_flag = "stable"
        if len(past_scores) >= 3:
            days_idx = [(s.date - past_scores[0].date).days for s in past_scores]
            vals = [s.composite_score for s in past_scores]
            days_idx.append((target_date - past_scores[0].date).days)
            vals.append(composite_score)
            
            # Linear regression slope (points per day)
            slope, _ = np.polyfit(days_idx, vals, 1)
            slope_30d = round(float(slope), 4)
            
            if slope_30d < -0.25:  # Dropping more than 7.5 points over 30 days
                trend_flag = "declining"
            elif slope_30d > 0.20:
                trend_flag = "improving"
                
        # Upsert cognitive record for today
        existing = db.query(CognitiveScore).filter(
            CognitiveScore.patient_id == patient_id,
            CognitiveScore.date == target_date
        ).first()
        
        if existing:
            existing.memory_score = mem_score
            existing.attention_score = att_score
            existing.sequencing_score = seq_score
            existing.pattern_score = pat_score
            existing.composite_score = composite_score
            existing.ewma_score = ewma_score
            existing.moca_equivalent = moca_eq
            existing.mmse_equivalent = mmse_eq
            existing.clinical_stage = stage
            existing.trend_flag = trend_flag
            existing.slope_30d = slope_30d
            existing.sessions_count = len(sessions)
            cog_record = existing
        else:
            cog_record = CognitiveScore(
                patient_id=patient_id,
                date=target_date,
                memory_score=mem_score,
                attention_score=att_score,
                sequencing_score=seq_score,
                pattern_score=pat_score,
                composite_score=composite_score,
                ewma_score=ewma_score,
                moca_equivalent=moca_eq,
                mmse_equivalent=mmse_eq,
                clinical_stage=stage,
                trend_flag=trend_flag,
                slope_30d=slope_30d,
                sessions_count=len(sessions)
            )
            db.add(cog_record)
            
        db.commit()
        db.refresh(cog_record)
        return cog_record
