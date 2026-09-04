"""
backend/app/services/memory_adaptation_service.py

Orchestrates the REAL AI adaptation loop for Memory Pairs:

 completed session --> compute reward for PENDING candidate (if any)
                    --> model.partial_fit() [REAL update]
                    --> extract patient state features
                    --> generate safe candidate configurations
                    --> model.predict() each candidate [REAL inference]
                    --> selection (forced-exploration bootstrap, then
                        epsilon-greedy explore/exploit once trained)
                    --> safety layer clamps the choice
                    --> persist decision + pending context
                    --> return next configuration + full diagnostics
"""
import random
from typing import Dict, Any, List

from backend.ml import memory_bandit as bandit
from backend.ml.memory_bandit import LEVEL_CONFIGS

MODEL_NAME = "SGDRegressor (online contextual bandit, patient-specific, squared_error loss)"

# ---------------------------------------------------------------------------
# Reward: derived ENTIRELY from the real outcome of the session that was
# actually played under a given candidate configuration. It is NOT a proxy
# for "increase/maintain/decrease" and is NOT a clinical score.
#
#   flow_score              -> peaks when accuracy sits near a target
#                               "flow" band (0.75), rather than rewarding
#                               maximum accuracy outright. This keeps the
#                               bandit from collapsing onto "always easiest".
#   (1 - error_rate)        -> fewer incorrect match attempts
#   completion_efficiency   -> fraction of pairs actually completed
#   hint_dependence penalty -> discourages configs that require heavy help
#   hesitation penalty      -> discourages configs that cause long pauses
#   abandonment penalty     -> large penalty if the session was abandoned/timed out
# ---------------------------------------------------------------------------
def compute_reward(session: Dict[str, Any]) -> float:
    accuracy = float(session.get("accuracy") or 0.0)
    total_attempts = float(session.get("total_attempts") or 0)
    incorrect = float(session.get("incorrect_attempts") or 0)
    error_rate = (incorrect / total_attempts) if total_attempts > 0 else 0.0

    pair_count = float(session.get("pair_count") or 1)
    pairs_completed = float(session.get("pairs_completed") or 0)
    completion_efficiency = min(1.0, pairs_completed / pair_count) if pair_count > 0 else 0.0

    hint_limit = float(session.get("hint_limit") or 3)
    hints_used = float(session.get("hints_used") or 0)
    hint_dependence = min(1.0, hints_used / hint_limit) if hint_limit > 0 else 0.0

    hesitation_ms = float(session.get("maximum_hesitation_ms") or 0)
    hesitation_norm = min(1.0, hesitation_ms / 5000.0)

    abandoned = 1.0 if session.get("completion_status") in ("abandoned", "timeout") else 0.0

    flow_score = max(0.0, 1.0 - abs(accuracy - 0.75) / 0.75)

    reward = (
        0.35 * flow_score
        + 0.25 * (1.0 - error_rate)
        + 0.20 * completion_efficiency
        - 0.15 * hint_dependence
        - 0.10 * hesitation_norm
        - 0.50 * abandoned
    )
    return max(-1.0, min(1.0, round(reward, 4)))


def _rel(value: float, stat: Dict[str, float]) -> float:
    if stat["n"] < 3:
        return 0.0
    std = bandit._welford_std(stat)
    return max(-3.0, min(3.0, (value - stat["mean"]) / std))


def build_context_features(session: Dict[str, Any], state: Dict[str, Any], current_level: int) -> List[float]:
    accuracy = float(session.get("accuracy") or 0.0)
    total_attempts = float(session.get("total_attempts") or 0)
    incorrect = float(session.get("incorrect_attempts") or 0)
    error_rate = (incorrect / total_attempts) if total_attempts > 0 else 0.0
    hint_limit = float(session.get("hint_limit") or 3)
    hints_used = float(session.get("hints_used") or 0)
    hint_dependence = min(1.0, hints_used / hint_limit) if hint_limit > 0 else 0.0
    hesitation_ms = float(session.get("maximum_hesitation_ms") or 0)
    hesitation_norm = min(1.0, hesitation_ms / 5000.0)
    pair_count = float(session.get("pair_count") or 1)
    pairs_completed = float(session.get("pairs_completed") or 0)
    completion_efficiency = min(1.0, pairs_completed / pair_count) if pair_count > 0 else 0.0
    abandoned = 1.0 if session.get("completion_status") in ("abandoned", "timeout") else 0.0
    rt = float(session.get("average_attempt_duration_ms") or session.get("avg_reaction_time_ms") or 0)

    baseline = state["baseline"]
    rel_accuracy = _rel(accuracy, baseline["accuracy"])
    rel_rt = _rel(rt, baseline["reaction_time_ms"])
    rel_error = _rel(error_rate, baseline["error_rate"])

    return [
        accuracy, error_rate, hint_dependence, hesitation_norm, completion_efficiency,
        abandoned, current_level / 5.0, rel_accuracy, rel_rt, rel_error,
    ]


def _update_baselines(state: Dict[str, Any], session: Dict[str, Any]) -> Dict[str, Any]:
    if session.get("completion_status") != "completed":
        return state
    accuracy = float(session.get("accuracy") or 0.0)
    total_attempts = float(session.get("total_attempts") or 0)
    incorrect = float(session.get("incorrect_attempts") or 0)
    error_rate = (incorrect / total_attempts) if total_attempts > 0 else 0.0
    rt = float(session.get("average_attempt_duration_ms") or session.get("avg_reaction_time_ms") or 0)
    state["baseline"]["accuracy"] = bandit._update_welford(state["baseline"]["accuracy"], accuracy)
    state["baseline"]["error_rate"] = bandit._update_welford(state["baseline"]["error_rate"], error_rate)
    if rt > 0:
        state["baseline"]["reaction_time_ms"] = bandit._update_welford(state["baseline"]["reaction_time_ms"], rt)
    return state


def generate_candidates(current_level: int, current_config: Dict[str, Any]) -> List[Dict[str, Any]]:
    candidates = []
    for lvl in (current_level - 1, current_level, current_level + 1):
        if 1 <= lvl <= 5:
            base = LEVEL_CONFIGS[lvl]
            candidates.append({
                "label": f"level_{lvl}", "level": lvl, "pairs": base["pairs"],
                "time_limit_sec": base["time_limit_sec"], "hints": base["hints"],
                "delta_type": "maintain" if lvl == current_level else ("level_up" if lvl > current_level else "level_down"),
            })
    base_cur = LEVEL_CONFIGS[current_level]
    more_time = dict(base_cur); more_time["time_limit_sec"] = min(90, int(base_cur["time_limit_sec"] * 1.15))
    candidates.append({"label": "same_level_more_time", "level": current_level, **more_time, "delta_type": "more_time"})
    fewer_hints = dict(base_cur); fewer_hints["hints"] = max(1, base_cur["hints"] - 1)
    candidates.append({"label": "same_level_fewer_hints", "level": current_level, **fewer_hints, "delta_type": "fewer_hints"})
    more_hints = dict(base_cur); more_hints["hints"] = min(3, base_cur["hints"] + 1)
    candidates.append({"label": "same_level_more_hints", "level": current_level, **more_hints, "delta_type": "more_hints"})

    # --- Level-up variants: give the model a chance to evaluate level_up under
    # friendlier conditions (more time, more hints) so it's not penalised by
    # the patient struggling with raw harder settings on first encounter. ---
    next_lvl = current_level + 1
    if 1 <= next_lvl <= 5:
        base_next = LEVEL_CONFIGS[next_lvl]
        # level_up with extra time
        candidates.append({
            "label": f"level_{next_lvl}_more_time", "level": next_lvl,
            "pairs": base_next["pairs"],
            "time_limit_sec": min(90, int(base_next["time_limit_sec"] * 1.20)),
            "hints": base_next["hints"],
            "delta_type": "level_up_more_time",
        })
        # level_up with extra hints
        candidates.append({
            "label": f"level_{next_lvl}_more_hints", "level": next_lvl,
            "pairs": base_next["pairs"],
            "time_limit_sec": base_next["time_limit_sec"],
            "hints": min(3, base_next["hints"] + 1),
            "delta_type": "level_up_more_hints",
        })
    return candidates


def _encode_candidate(candidate: Dict[str, Any], current_config: Dict[str, Any]) -> List[float]:
    level_delta = candidate["level"] - current_config.get("level", 1)
    pairs_delta = candidate["pairs"] - current_config.get("pairs", LEVEL_CONFIGS[1]["pairs"])
    cur_time = current_config.get("time_limit_sec", LEVEL_CONFIGS[1]["time_limit_sec"]) or 1
    time_delta_pct = (candidate["time_limit_sec"] - cur_time) / max(1, cur_time)
    hints_delta = candidate["hints"] - current_config.get("hints", LEVEL_CONFIGS[1]["hints"])
    return [max(-1, min(1, level_delta)), max(-1, min(1, pairs_delta)),
            max(-0.5, min(0.5, time_delta_pct)), max(-1, min(1, hints_delta))]


def _apply_safety_layer(candidate: Dict[str, Any], current_config: Dict[str, Any]) -> Dict[str, Any]:
    """The ONLY place that enforces hard limits. It never chooses -- it only clamps
    what the model already picked: level in [1,5], never more than +/-1 level per
    session, hints in [1,3], time_limit in [30,90]s."""
    level = max(1, min(5, candidate["level"]))
    cur_level = current_config.get("level", 1)
    if level > cur_level + 1:
        level = cur_level + 1
    if level < cur_level - 1:
        level = cur_level - 1
    base = LEVEL_CONFIGS[level]
    pairs = base["pairs"]
    time_limit_sec = max(30, min(90, int(candidate.get("time_limit_sec", base["time_limit_sec"]))))
    hints = max(1, min(3, int(candidate.get("hints", base["hints"]))))
    return {"level": level, "pairs": pairs, "time_limit_sec": time_limit_sec, "hints": hints}


def decide_next_configuration(patient_id: str, session: Dict[str, Any]) -> Dict[str, Any]:
    state = bandit.load_patient_state(patient_id)
    diagnostics: Dict[str, Any] = {"model_name": MODEL_NAME, "patient_id": patient_id}

    print("\n" + "=" * 60)
    print("[MEMORY AI] decide_next_configuration() CALLED")
    print(f"[MEMORY AI] patient_id = {patient_id}")
    print(f"[MEMORY AI] session difficulty_level = {session.get('difficulty_level')}")
    print(f"[MEMORY AI] session accuracy = {session.get('accuracy')}")
    print(f"[MEMORY AI] session completion_status = {session.get('completion_status')}")
    print(f"[MEMORY AI] current state observations = {state['observations']}")
    print(f"[MEMORY AI] current state model is None = {state['model'] is None}")
    print(f"[MEMORY AI] current state current_config = {state['current_config']}")
    print(f"[MEMORY AI] current state pending = {state['pending'] is not None}")

    reward = None
    if state["pending"] is not None:
        reward = compute_reward(session)
        pending_candidate = state["pending"]["candidate"]
        pending_fv = state["pending"]["feature_vector"]
        print(f"[MEMORY AI] TRAINING MODEL")
        print(f"[MEMORY AI]   observation number = {state['observations'] + 1}")
        print(f"[MEMORY AI]   reward = {reward}")
        print(f"[MEMORY AI]   pending candidate = {pending_candidate}")
        print(f"[MEMORY AI]   feature vector = {pending_fv}")
        state = bandit.partial_fit(state, pending_fv, reward)
        state["history"].append({"obs_index": state["observations"], "candidate": pending_candidate["label"], "reward": reward})
        state["history"] = state["history"][-50:]
        state["pending"] = None
        print(f"[MEMORY AI]   observations after fit = {state['observations']}")
    else:
        print("[MEMORY AI] NO PENDING candidate — skipping training")

    state = _update_baselines(state, session)

    current_level = int(session.get("difficulty_level") or state["current_config"].get("level", 1))
    current_config = state["current_config"]
    print(f"[MEMORY AI] current_level for candidate generation = {current_level}")
    print(f"[MEMORY AI] current_config = {current_config}")

    context = build_context_features(session, state, current_level)
    candidates = generate_candidates(current_level, current_config)
    print(f"[MEMORY AI] context features = {context}")
    print(f"[MEMORY AI] candidates = {[c['label'] for c in candidates]}")

    status = bandit.model_status(state)
    predictions: Dict[str, float] = {}
    epsilon = round(max(0.1, 1.0 / (1 + state["observations"])), 3)
    explored = False
    print(f"[MEMORY AI] model_status = {status}")
    print(f"[MEMORY AI] epsilon = {epsilon}")

    if status in ("cold_start", "warming_up"):
        chosen = candidates[state["observations"] % len(candidates)]
        mode = status + "_bootstrap_explore"
        print(f"[MEMORY AI] BOOTSTRAP EXPLORE: chose {chosen['label']} (index {state['observations'] % len(candidates)})")
    else:
        for c in candidates:
            fv = context + _encode_candidate(c, current_config)
            pred = bandit.predict(state, fv)
            predictions[c["label"]] = round(pred, 4) if pred is not None else None
        print("[MEMORY AI] PREDICTIONS:")
        for label, pred_val in predictions.items():
            print(f"[MEMORY AI]   {label} -> {pred_val}")
        if random.random() < epsilon:
            chosen = random.choice(candidates)
            explored = True
            mode = "model_explore"
            print(f"[MEMORY AI] EXPLORE: randomly chose {chosen['label']}")
        else:
            best_pred = max(predictions.values())
            top_candidates = [c for c in candidates if abs(predictions.get(c["label"], -999) - best_pred) < 1e-6]
            chosen = random.choice(top_candidates)
            mode = "model_exploit"
            print(f"[MEMORY AI] EXPLOIT: best_pred = {best_pred}, top = {[c['label'] for c in top_candidates]}, chose = {chosen['label']}")

    final_config = _apply_safety_layer(chosen, current_config)
    safety_note = "none"
    if final_config["level"] != chosen["level"] or final_config["hints"] != chosen.get("hints") or final_config["time_limit_sec"] != chosen.get("time_limit_sec"):
        safety_note = f"clamped candidate {chosen} -> {final_config} per safety bounds"

    print(f"[MEMORY AI] FINAL DECISION: {chosen['label']} -> final_config = {final_config}")
    print(f"[MEMORY AI] safety_adjustment = {safety_note}")

    state["pending"] = {"feature_vector": context + _encode_candidate(chosen, current_config), "candidate": chosen}
    state["current_config"] = final_config
    bandit.save_patient_state(patient_id, state)
    print(f"[MEMORY AI] State saved. Next round should be Level {final_config['level']}")
    print("=" * 60 + "\n")

    diagnostics.update({
        "model_status": status,
        "training_observations": state["observations"],
        "reward_from_previous_session": reward,
        "candidates_evaluated": [c["label"] for c in candidates],
        "predicted_outcomes": predictions if predictions else "cold_start_no_predictions",
        "epsilon": epsilon,
        "exploration_used": explored,
        "selected_candidate": chosen["label"],
        "selection_mode": mode,
        "safety_adjustment": safety_note,
        "final_configuration": final_config,
    })
    return diagnostics