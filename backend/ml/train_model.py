import os
import json
import pandas as pd
from typing import Dict, Any
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupKFold
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import joblib

from backend.app.core.database import SessionLocal
from backend.ml.prepare_dataset import prepare_training_data

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'adaptation_model.joblib')
METADATA_PATH = os.path.join(MODEL_DIR, 'model_metadata.json')

def validate_dataset(df: pd.DataFrame, y: pd.Series) -> bool:
    """
    Strict dataset validation to prevent training on insufficient or synthetic data.
    """
    if df.empty or y.empty:
        print("Dataset is empty.")
        return False
        
    num_samples = len(df)
    if 'patient_id' not in df.columns:
        print("Missing patient_id in dataset.")
        return False
        
    num_patients = df['patient_id'].nunique()
    
    # 1. Check minimum samples
    if num_samples < 200:
        print(f"Insufficient samples: {num_samples}. Required: >= 200.")
        return False
        
    # 2. Check minimum patients
    if num_patients < 50:
        print(f"Insufficient patients: {num_patients}. Required: >= 50.")
        return False
        
    # 3. Check class distribution (Need at least some variation)
    class_counts = y.value_counts()
    if len(class_counts) < 2:
        print(f"Insufficient class diversity: {class_counts.to_dict()}")
        return False
        
    # Require at least 20 samples of each class represented
    if any(count < 20 for count in class_counts):
        print(f"Class distribution too skewed: {class_counts.to_dict()}")
        return False
        
    return True

def train_and_evaluate():
    db = SessionLocal()
    try:
        print("Fetching and preparing dataset...")
        X, y = prepare_training_data(db)
    except Exception as e:
        print(f"Failed to prepare data: {e}")
        db.close()
        return
    finally:
        db.close()
        
    print(f"Prepared {len(X)} samples.")
    
    if not validate_dataset(X, y):
        print("Dataset validation failed. NO MODEL TRAINED.")
        return
        
    groups = X.pop('patient_id')
    
    # Define features to use
    features = [
        "memory_success_rate", "error_rate", "response_speed",
        "hesitation_index", "hint_dependence", "abandoned",
        "game_level", "pairs"
    ]
    
    # Add any extended features if available in DataFrame
    available_features = [f for f in features if f in X.columns]
    X_train = X[available_features]
    
    print("Training RandomForestClassifier...")
    # Using GroupKFold for patient-aware splitting during evaluation
    gkf = GroupKFold(n_splits=5)
    
    # We will just train on the full dataset for the final model, 
    # but let's evaluate on a split first to get metrics.
    fold_metrics = []
    
    model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
    
    for train_idx, test_idx in gkf.split(X_train, y, groups):
        X_tr, X_te = X_train.iloc[train_idx], X_train.iloc[test_idx]
        y_tr, y_te = y.iloc[train_idx], y.iloc[test_idx]
        
        model.fit(X_tr, y_tr)
        preds = model.predict(X_te)
        
        fold_metrics.append({
            'accuracy': accuracy_score(y_te, preds),
            'precision': precision_score(y_te, preds, average='weighted', zero_division=0),
            'recall': recall_score(y_te, preds, average='weighted', zero_division=0),
            'f1': f1_score(y_te, preds, average='weighted', zero_division=0)
        })
        
    # Train final model on all data
    model.fit(X_train, y)
    
    avg_metrics = {
        'accuracy': sum(m['accuracy'] for m in fold_metrics) / len(fold_metrics),
        'precision': sum(m['precision'] for m in fold_metrics) / len(fold_metrics),
        'recall': sum(m['recall'] for m in fold_metrics) / len(fold_metrics),
        'f1': sum(m['f1'] for m in fold_metrics) / len(fold_metrics)
    }
    
    print(f"Evaluation Metrics: {avg_metrics}")
    
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    
    metadata = {
        "status": "trained",
        "model_class": "RandomForestClassifier",
        "samples": len(X),
        "patients": len(groups.unique()),
        "metrics": avg_metrics,
        "features": available_features
    }
    
    with open(METADATA_PATH, 'w') as f:
        json.dump(metadata, f, indent=2)
        
    print(f"Model saved to {MODEL_PATH}")

if __name__ == "__main__":
    train_and_evaluate()
