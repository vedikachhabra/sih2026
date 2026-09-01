import json
from typing import Dict, Any

def extract_features(session) -> Dict[str, Any]:
    """
    Parses the extended_telemetry JSON string from a GameSession
    and computes the core game-derived indicators.
    """
    ext = {}
    if session.extended_telemetry:
        try:
            ext = json.loads(session.extended_telemetry)
        except:
            pass
            
    total_attempts = ext.get('total_attempts', 0)
    correct_attempts = ext.get('correct_attempts', 0)
    incorrect_attempts = ext.get('incorrect_attempts', 0)
    
    hint_limit = ext.get('hint_limit', 3)
    hints_used = session.hints_used
    
    accuracy = session.accuracy
    rt = session.avg_reaction_time_ms
    
    hesitation_index = ext.get('maximum_hesitation_ms', 0)
    
    # Target Features
    memory_success_rate = accuracy
    error_rate = (incorrect_attempts / total_attempts) if total_attempts > 0 else 0
    response_speed = rt
    hint_dependence = (hints_used / hint_limit) if hint_limit > 0 else 0
    
    # Abandonment
    abandoned = 1 if session.completion_status in ["abandoned", "timeout"] else 0
    
    return {
        "memory_success_rate": memory_success_rate,
        "error_rate": error_rate,
        "response_speed": response_speed,
        "hesitation_index": hesitation_index,
        "hint_dependence": hint_dependence,
        "abandoned": abandoned,
        "game_level": session.difficulty_level,
        "pairs": ext.get('pair_count', 4)
    }
