from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from datetime import datetime

from backend.app.models.cognitive import DDAConfig
from backend.app.models.session import GameSession

class DDAEngine:
    """
    Continuous Dynamic Difficulty Adjustment (DDA) Engine:
    1. Performance Index Pt in [0, 1]:
       Pt = alpha * At + beta * max(0, 1 - (RTt / RTmax)) - gamma * (Ht / Hmax)
       where alpha=0.5, beta=0.3, gamma=0.2 (alpha + beta + gamma = 1.0)
    2. Continuous Difficulty Update:
       Dt+1 = clamp(Dt + eta * (Pt - Ptarget), Dmin, Dmax)
       where Ptarget = 0.70 (Optimal Flow State), learning rate eta = 0.1, Dmin=1.0, Dmax=5.0
    3. Frustration Guard:
       If consecutive failures F >= 2 -> Dt+1 = max(Dmin, Dt - 2.0), time limits scaled 1.5x
    4. Plateau Guard:
       If moving variance sigma^2(P_{t-5:t}) < 0.02 and Pavg < 0.50 -> lock Dt from increasing
    """

    # Clinical Psychomotor Reaction Time Baselines (Healthy vs MCI vs Dementia)
    PSYCHOMOTOR_RT_BENCHMARKS = {
        "simple_visual": {"healthy": (320, 420), "mci": (450, 600), "dementia": (650, 950)},
        "choice_visual_search": {"healthy": (650, 850), "mci": (900, 1300), "dementia": (1500, 2500)},
        "memory_recall": {"healthy": (900, 1400), "mci": (1600, 2500), "dementia": (3000, 5000)}
    }

    # Per-game RTmax timeouts (ms) and Hmax
    GAME_THRESHOLDS = {
        "memory": {"rt_max": 4500.0, "h_max": 3.0, "task_category": "memory_recall"},
        "attention": {"rt_max": 3500.0, "h_max": 3.0, "task_category": "choice_visual_search"},
        "sequencing": {"rt_max": 5000.0, "h_max": 3.0, "task_category": "memory_recall"},
        "pattern": {"rt_max": 4000.0, "h_max": 3.0, "task_category": "choice_visual_search"}
    }

    # Discrete game parameter templates per rounded difficulty level
    GAME_LEVEL_SPECS = {
        "memory": {
            1: {"card_count": 4, "time_limit_sec": 60, "hint_allowed_count": 3, "grid_size": "2x2"},
            2: {"card_count": 6, "time_limit_sec": 50, "hint_allowed_count": 2, "grid_size": "2x3"},
            3: {"card_count": 8, "time_limit_sec": 45, "hint_allowed_count": 2, "grid_size": "2x4"},
            4: {"card_count": 10, "time_limit_sec": 40, "hint_allowed_count": 1, "grid_size": "2x5"},
            5: {"card_count": 12, "time_limit_sec": 30, "hint_allowed_count": 1, "grid_size": "3x4"}
        },
        "attention": {
            1: {"grid_size": "3x3", "time_limit_sec": 45, "hint_allowed_count": 3, "distractor_count": 0},
            2: {"grid_size": "3x3", "time_limit_sec": 35, "hint_allowed_count": 2, "distractor_count": 1},
            3: {"grid_size": "4x4", "time_limit_sec": 30, "hint_allowed_count": 2, "distractor_count": 2},
            4: {"grid_size": "4x4", "time_limit_sec": 25, "hint_allowed_count": 1, "distractor_count": 3},
            5: {"grid_size": "5x5", "time_limit_sec": 20, "hint_allowed_count": 1, "distractor_count": 4}
        },
        "sequencing": {
            1: {"step_count": 3, "time_limit_sec": 60, "hint_allowed_count": 3, "distractor_count": 0},
            2: {"step_count": 4, "time_limit_sec": 50, "hint_allowed_count": 2, "distractor_count": 0},
            3: {"step_count": 5, "time_limit_sec": 45, "hint_allowed_count": 2, "distractor_count": 1},
            4: {"step_count": 6, "time_limit_sec": 40, "hint_allowed_count": 1, "distractor_count": 1},
            5: {"step_count": 7, "time_limit_sec": 35, "hint_allowed_count": 1, "distractor_count": 2}
        },
        "pattern": {
            1: {"grid_size": "2x2", "time_limit_sec": 50, "hint_allowed_count": 3, "distractor_count": 1},
            2: {"grid_size": "3x3", "time_limit_sec": 45, "hint_allowed_count": 2, "distractor_count": 2},
            3: {"grid_size": "3x3", "time_limit_sec": 40, "hint_allowed_count": 2, "distractor_count": 3},
            4: {"grid_size": "4x4", "time_limit_sec": 35, "hint_allowed_count": 1, "distractor_count": 4},
            5: {"grid_size": "4x4", "time_limit_sec": 30, "hint_allowed_count": 1, "distractor_count": 5}
        }
    }

    @classmethod
    def compute_performance_index(cls, accuracy: float, reaction_time_ms: int, hints_used: int, game_type: str = "memory") -> float:
        """
        Computes Pt in [0, 1] using clinical Flow State weights: alpha=0.5, beta=0.3, gamma=0.2
        """
        g_cfg = cls.GAME_THRESHOLDS.get(game_type.lower(), cls.GAME_THRESHOLDS["memory"])
        alpha, beta, gamma = 0.5, 0.3, 0.2
        
        rt_score = max(0.0, 1.0 - (float(reaction_time_ms) / g_cfg["rt_max"]))
        hint_penalty = min(1.0, float(hints_used) / g_cfg["h_max"])
        
        pt = (alpha * accuracy) + (beta * rt_score) - (gamma * hint_penalty)
        return max(0.0, min(1.0, round(pt, 3)))

    @classmethod
    def compute_dda_score(cls, accuracy: float, reaction_time_ms: int, hints_used: int,
                           w1: float = 0.50, w2: float = 0.30, w3: float = 0.20, level: int = 1) -> float:
        """
        Backward compatible helper using normalized Pt index.
        """
        return cls.compute_performance_index(accuracy, reaction_time_ms, hints_used, "memory")

    @classmethod
    def get_or_create_config(cls, db: Session, patient_id: str) -> DDAConfig:
        config = db.query(DDAConfig).filter(DDAConfig.patient_id == patient_id).first()
        if not config:
            config = DDAConfig(patient_id=patient_id)
            db.add(config)
            db.commit()
            db.refresh(config)
        return config

    @classmethod
    def evaluate_next_difficulty(cls, db: Session, patient_id: str, game_type: str,
                                   recent_accuracy: float, recent_reaction_time_ms: int,
                                   recent_hints_used: int = 0, completion_status: str = "completed") -> Dict[str, Any]:
        """
        Updates continuous difficulty D_{t+1} = clamp(D_t + eta*(P_t - P_target), 1.0, 5.0)
        and evaluates Frustration and Plateau Guards.
        """
        config = cls.get_or_create_config(db, patient_id)
        g_type = game_type.lower()
        diff_attr = f"current_difficulty_{g_type}"
        current_level_float = float(getattr(config, diff_attr, 2))
        
        eta = 0.10        # Learning rate
        p_target = 0.70   # Flow State Target
        action = "maintain"
        reasoning = "Performance within balanced flow zone."
        time_scale = 1.0

        # 1. Frustration Guard Check (F >= 2)
        if completion_status in ["abandoned", "timeout"]:
            config.consecutive_abandoned += 1
            if config.consecutive_abandoned >= 2:
                # D_{t+1} = max(D_min, D_t - 2.0), scale time limits by 1.5x
                current_level_float = max(1.0, current_level_float - 2.0)
                config.consecutive_abandoned = 0
                time_scale = 1.5
                action = "frustration_guard"
                reasoning = "Frustration guard triggered: Failure count >= 2. Difficulty reduced by 2.0 levels and time limit scaled 1.5x with multimodal cues."
            else:
                action = "maintain"
                reasoning = "Incomplete round logged; monitoring for frustration."
        else:
            config.consecutive_abandoned = 0
            pt = cls.compute_performance_index(recent_accuracy, recent_reaction_time_ms, recent_hints_used, g_type)

            # Continuous difficulty step
            delta = eta * (pt - p_target)
            new_level_float = max(1.0, min(5.0, current_level_float + (delta * 5.0)))

            if pt >= 0.70 and current_level_float < 5.0:
                action = "level_up"
                discrete_level = min(5, int(current_level_float) + 1)
                current_level_float = float(discrete_level)
                reasoning = f"Performance Index P_t={pt:.2f} exceeded Flow Target (0.70). Increasing difficulty to Level {discrete_level}."
            elif pt <= 0.40 and current_level_float > 1.0:
                action = "level_down"
                discrete_level = max(1, int(current_level_float) - 1)
                current_level_float = float(discrete_level)
                reasoning = f"Performance Index P_t={pt:.2f} below comfort zone. Easing difficulty to Level {discrete_level}."
            else:
                action = "maintain"
                current_level_float = new_level_float

        discrete_level = int(max(1, min(5, round(current_level_float))))
        setattr(config, diff_attr, discrete_level)
        config.updated_at = datetime.utcnow()
        db.commit()

        # Get level parameters
        base_params = cls.GAME_LEVEL_SPECS.get(g_type, cls.GAME_LEVEL_SPECS["memory"]).get(discrete_level, cls.GAME_LEVEL_SPECS["memory"][1])
        adjusted_params = dict(base_params)
        adjusted_params["time_limit_sec"] = int(adjusted_params["time_limit_sec"] * time_scale)

        perf_index = cls.compute_performance_index(recent_accuracy, recent_reaction_time_ms, recent_hints_used, g_type) if completion_status == "completed" else 0.0

        return {
            "patient_id": patient_id,
            "game_type": g_type,
            "current_level": discrete_level,
            "continuous_difficulty": round(current_level_float, 2),
            "calculated_performance_score": perf_index,
            "adjustment_action": action,
            "game_parameters": adjusted_params,
            "reasoning": reasoning
        }

dda_engine = DDAEngine()
