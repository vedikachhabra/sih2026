from typing import Dict, Any

class SafetyLayer:
    """
    Constrains the adaptation model to ensure patient safety.
    Rule 1: Never increase difficulty by more than 1 level at a time.
    Rule 2: Never decrease difficulty by more than 1 level at a time.
    Rule 3: Keep level between 1 and 5.
    Rule 4: Adjust timing/hint configuration appropriately based on primary_focus.
    """
    MAX_LEVEL = 5
    MIN_LEVEL = 1

    def apply_constraints(self, proposed_decision: Dict[str, Any], current_level: int, current_config: Dict[str, Any]) -> Dict[str, Any]:
        action = proposed_decision.get("difficulty_action", "maintain")
        focus = proposed_decision.get("primary_focus", "general")
        
        new_level = current_level
        new_config = dict(current_config) if current_config else {}
        
        # Default safety bounds for configs if none exist
        if not new_config:
            new_config = {
                "display_time_ms": 3000,
                "max_hints": 3,
                "pairs": 3
            }
        
        if action == "increase":
            new_level = min(current_level + 1, self.MAX_LEVEL)
        elif action == "decrease":
            new_level = max(current_level - 1, self.MIN_LEVEL)
            
        # Refine configuration based on focus
        if focus == "response_efficiency":
            # Give them more time, but maybe keep the level the same
            new_config["display_time_ms"] = min(new_config.get("display_time_ms", 3000) + 1000, 6000)
        elif focus == "memory":
            # Keep level same or lower, increase hints
            new_config["max_hints"] = min(new_config.get("max_hints", 3) + 1, 5)
        elif focus == "working_memory":
            # If they are doing well, reduce hints and display time
            new_config["max_hints"] = max(new_config.get("max_hints", 3) - 1, 1)
            new_config["display_time_ms"] = max(new_config.get("display_time_ms", 3000) - 500, 1500)
            
        # Ensure pairing logic matches level if pairs are required by the game
        # E.g. Level 1: 2 pairs, Level 2: 3 pairs, Level 3: 4 pairs...
        # Wait, the fallback/client handles this, but we can set a safe pairs value
        new_config["pairs"] = min(max(new_level + 1, 2), 6) 
            
        return {
            "level": new_level,
            "config": new_config,
            "reasoning": f"Safely bounded proposed {action} action targeting {focus}."
        }

safety_layer = SafetyLayer()

def apply_safety_layer(proposed_decision: Dict[str, Any], current_level: int, current_config: Dict[str, Any] = None) -> Dict[str, Any]:
    return safety_layer.apply_constraints(proposed_decision, current_level, current_config)
