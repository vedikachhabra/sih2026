import os
import json
import joblib
from typing import Dict, Any, Tuple
from backend.ml.feature_engineering import extract_features

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'adaptation_model.joblib')
METADATA_PATH = os.path.join(MODEL_DIR, 'model_metadata.json')

_model = None
_metadata = None

def load_model():
    global _model, _metadata
    if _model is not None:
        return True
        
    if not os.path.exists(MODEL_PATH) or not os.path.exists(METADATA_PATH):
        return False
        
    try:
        with open(METADATA_PATH, 'r') as f:
            _metadata = json.load(f)
            
        if _metadata.get("status") != "trained":
            return False
            
        _model = joblib.load(MODEL_PATH)
        return True
    except Exception as e:
        print(f"Error loading model: {e}")
        return False

def get_ml_decision(session_features: Dict[str, Any], baseline_features: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    """
    Returns (decision_mode, prediction_dict)
    """
    if not load_model():
        return "adaptive_fallback", {}
        
    try:
        # Use features provided from the frontend
        features = dict(session_features)
        # Add baseline deviations if expected by model
        features['baseline_deviation_acc'] = baseline_features.get('baseline_deviation_acc', 0)
        features['baseline_deviation_rt'] = baseline_features.get('baseline_deviation_rt', 0)
        
        expected_features = _metadata.get("features", [])
        
        # Prepare feature vector in the correct order
        import pandas as pd
        feature_vector = pd.DataFrame([{f: features.get(f, 0) for f in expected_features}])
        
        # Predict
        predicted_action = _model.predict(feature_vector)[0]
        
        # Determine primary focus based on feature importance or simple heuristics 
        # (Since we predict action, focus can be a secondary output if the model was trained for it)
        # For this prototype, if action is maintain and they are slow, we focus on speed.
        primary_focus = "general"
        if predicted_action == "maintain":
            if features.get("response_speed", 0) > 6000:
                primary_focus = "response_efficiency"
            elif features.get("memory_success_rate", 1) < 0.7:
                primary_focus = "memory"
        elif predicted_action == "increase":
            primary_focus = "working_memory"
        else:
            primary_focus = "assistance"
            
        return "ml", {
            "difficulty_action": predicted_action,
            "primary_focus": primary_focus
        }
    except Exception as e:
        print(f"ML Inference error: {e}")
        return "adaptive_fallback", {}
