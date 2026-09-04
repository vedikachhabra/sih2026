"""
backend/ml/memory_bandit.py

REAL online contextual-bandit learner for the Memory Pairs game.

Model: sklearn.linear_model.SGDRegressor (squared_error loss), one instance
PER PATIENT, updated incrementally via partial_fit() on real completed
gameplay sessions. This is NOT a supervised classifier trained on old
rule-engine labels -- it predicts the expected reward (see
compute_reward() in memory_adaptation_service.py) of a candidate Memory
Pairs configuration, given the patient's current state, and is updated
only from the observed outcome of sessions the patient actually played.

Persistence: one joblib artifact per patient at
    backend/models/patient_models/<patient_id>/memory_bandit.joblib
containing the fitted SGDRegressor (or None if still cold-start),
the patient's running performance baseline, the number of real
training observations, and the "pending" feature vector awaiting
its outcome (see memory_adaptation_service.py for the full loop).
"""
import os
import copy
import joblib
import numpy as np
from typing import Dict, Any, Optional, List
from sklearn.linear_model import SGDRegressor

MODEL_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "patient_models")

# Safety-bounded base configuration table for Memory Pairs (Level 1-5)
LEVEL_CONFIGS = {
    1: {"pairs": 2, "time_limit_sec": 60, "hints": 3},
    2: {"pairs": 3, "time_limit_sec": 55, "hints": 2},
    3: {"pairs": 4, "time_limit_sec": 50, "hints": 2},
    4: {"pairs": 5, "time_limit_sec": 45, "hints": 1},
    5: {"pairs": 6, "time_limit_sec": 40, "hints": 1},
}

# Must be >= number of candidate types (6) so the forced-exploration
# bootstrap below can cover every candidate at least once before the
# model's own predictions are trusted.
COLD_START_MIN_OBSERVATIONS = 6
CONTEXT_DIM = 10
CANDIDATE_DIM = 4
FEATURE_DIM = CONTEXT_DIM + CANDIDATE_DIM


def _patient_dir(patient_id: str) -> str:
    d = os.path.join(MODEL_ROOT, patient_id)
    os.makedirs(d, exist_ok=True)
    return d


def _artifact_path(patient_id: str) -> str:
    return os.path.join(_patient_dir(patient_id), "memory_bandit.joblib")


def _new_baseline_stat() -> Dict[str, float]:
    return {"n": 0, "mean": 0.0, "m2": 0.0}  # Welford's online algorithm


def _update_welford(stat: Dict[str, float], value: float) -> Dict[str, float]:
    stat = dict(stat)
    stat["n"] += 1
    delta = value - stat["mean"]
    stat["mean"] += delta / stat["n"]
    delta2 = value - stat["mean"]
    stat["m2"] += delta * delta2
    return stat


def _welford_std(stat: Dict[str, float]) -> float:
    if stat["n"] < 2:
        return 0.0
    return max(1e-6, (stat["m2"] / (stat["n"] - 1)) ** 0.5)


def new_patient_state() -> Dict[str, Any]:
    return {
        "model": None,                 # SGDRegressor, created on first partial_fit
        "observations": 0,             # count of REAL partial_fit() calls executed
        "baseline": {
            "accuracy": _new_baseline_stat(),
            "reaction_time_ms": _new_baseline_stat(),
            "error_rate": _new_baseline_stat(),
            "hesitation_ms": _new_baseline_stat(),
        },
        "pending": None,               # {"feature_vector": [...], "candidate": {...}} awaiting next outcome
        "current_config": {"level": 1, **LEVEL_CONFIGS[1]},
        "history": [],                 # bounded diagnostic log of past decisions
    }


def load_patient_state(patient_id: str) -> Dict[str, Any]:
    path = _artifact_path(patient_id)
    if os.path.exists(path):
        try:
            return joblib.load(path)
        except Exception:
            pass
    return new_patient_state()


def save_patient_state(patient_id: str, state: Dict[str, Any]) -> None:
    joblib.dump(state, _artifact_path(patient_id))


def model_status(state: Dict[str, Any]) -> str:
    if state["observations"] == 0 or state["model"] is None:
        return "cold_start"
    if state["observations"] < COLD_START_MIN_OBSERVATIONS:
        return "warming_up"
    return "trained"


def partial_fit(state: Dict[str, Any], feature_vector: List[float], reward: float) -> Dict[str, Any]:
    """Executes a REAL model.partial_fit() call using an observed gameplay outcome."""
    state = copy.deepcopy(state)
    if state["model"] is None:
        state["model"] = SGDRegressor(
            loss="squared_error",
            penalty="l2",
            alpha=0.001,
            learning_rate="invscaling",
            eta0=0.05,
            random_state=42,
        )
    X = np.asarray([feature_vector], dtype=float)
    y = np.asarray([reward], dtype=float)
    state["model"].partial_fit(X, y)
    state["observations"] += 1
    return state


def predict(state: Dict[str, Any], feature_vector: List[float]) -> Optional[float]:
    if state["model"] is None:
        return None
    X = np.asarray([feature_vector], dtype=float)
    return float(state["model"].predict(X)[0])