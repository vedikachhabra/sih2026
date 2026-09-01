import pandas as pd
from typing import Tuple, List, Dict
from sqlalchemy.orm import Session
from backend.app.models.session import GameSession
from backend.ml.feature_engineering import extract_features

def prepare_training_data(db: Session, game_type: str = "memory") -> Tuple[pd.DataFrame, pd.Series]:
    """
    Extracts sessions from DB, orders by patient and time,
    computes baseline features, and generates labels based on
    the outcome of the NEXT session.
    """
    sessions = db.query(GameSession).filter(
        GameSession.game_type == game_type
    ).order_by(GameSession.patient_id, GameSession.started_at).all()
    
    if not sessions:
        return pd.DataFrame(), pd.Series(dtype=str)
        
    data = []
    
    # Group by patient
    patient_sessions = {}
    for s in sessions:
        patient_sessions.setdefault(s.patient_id, []).append(s)
        
    for pid, p_sess in patient_sessions.items():
        # Need at least 2 sessions to generate an outcome label for the first
        if len(p_sess) < 2:
            continue
            
        for i in range(len(p_sess) - 1):
            curr_s = p_sess[i]
            next_s = p_sess[i+1]
            
            features = extract_features(curr_s)
            
            # Generate Gameplay Adaptation Label (Not clinical)
            # Did the difficulty increase, decrease, or stay the same?
            lvl_diff = next_s.difficulty_level - curr_s.difficulty_level
            if lvl_diff > 0:
                historical_decision = "increase"
            elif lvl_diff < 0:
                historical_decision = "decrease"
            else:
                historical_decision = "maintain"
                
            # Evaluate if that historical decision was "beneficial"
            # (e.g. they completed the next session without abandoning, with decent accuracy)
            next_features = extract_features(next_s)
            next_success = (next_features["abandoned"] == 0) and (next_features["memory_success_rate"] >= 0.5)
            
            # If the next session was a failure, we flip the label to what it SHOULD have been
            # This is a heuristic label generator for prototype purposes
            target_label = historical_decision
            if not next_success:
                if historical_decision == "increase":
                    target_label = "maintain" # Shouldn't have increased
                elif historical_decision == "maintain":
                    target_label = "decrease" # Should have decreased
            
            # Add patient_id for GroupKFold splitting to prevent leakage
            row = features.copy()
            row["patient_id"] = pid
            row["target_difficulty_action"] = target_label
            
            data.append(row)
            
    if not data:
        return pd.DataFrame(), pd.Series(dtype=str)
        
    df = pd.DataFrame(data)
    y = df.pop("target_difficulty_action")
    return df, y
