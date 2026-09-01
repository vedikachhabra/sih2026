// PATIENT-SPECIFIC ADAPTIVE FALLBACK (and ML Client)
class OnDeviceDDA {
  constructor() {
    this.storageKey = "patient_dda_state";
    this.loadState();
  }

  loadState() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      this.state = JSON.parse(saved);
    } else {
      this.state = {
        levels: { memory: 1, attention: 1, sequencing: 1, pattern: 1 },
        configs: { memory: null, attention: null, sequencing: null, pattern: null },
        consecutive_abandoned: 0,
        baseline: {
          memory: { sessions: 0, avg_accuracy: null, avg_rt: null, avg_hints: null, avg_hesitation: null }
        }
      };
      this.saveState();
    }
    // Backward compatibility for newly added configs
    if (!this.state.configs) {
      this.state.configs = { memory: null, attention: null, sequencing: null, pattern: null };
    }
  }

  resetState() {
    localStorage.removeItem(this.storageKey);
    this.loadState();
  }

  saveState() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
  }

  // Parameter specs per level
  getLevelSpecs(gameType, level) {
    if (this.state.configs && this.state.configs[gameType]) {
        return this.state.configs[gameType];
    }
    const specs = {
      memory: {
        1: { cardCount: 4, timeLimitSec: 60, hintCount: 3, gridCols: 2 },
        2: { cardCount: 6, timeLimitSec: 50, hintCount: 2, gridCols: 3 },
        3: { cardCount: 8, timeLimitSec: 45, hintCount: 2, gridCols: 4 },
        4: { cardCount: 10, timeLimitSec: 40, hintCount: 1, gridCols: 5 },
        5: { cardCount: 12, timeLimitSec: 30, hintCount: 1, gridCols: 4 }
      },
      attention: {
        1: { gridSize: 3, timeLimitSec: 45, hintCount: 3 },
        2: { gridSize: 3, timeLimitSec: 35, hintCount: 2 },
        3: { gridSize: 4, timeLimitSec: 30, hintCount: 2 },
        4: { gridSize: 4, timeLimitSec: 25, hintCount: 1 },
        5: { gridSize: 5, timeLimitSec: 20, hintCount: 1 }
      },
      sequencing: {
        1: { stepCount: 3, timeLimitSec: 60, hintCount: 3 },
        2: { stepCount: 4, timeLimitSec: 50, hintCount: 2 },
        3: { stepCount: 5, timeLimitSec: 45, hintCount: 2 },
        4: { stepCount: 6, timeLimitSec: 40, hintCount: 1 },
        5: { stepCount: 7, timeLimitSec: 35, hintCount: 1 }
      },
      pattern: {
        1: { difficulty: "easy", timeLimitSec: 50, hintCount: 3 },
        2: { difficulty: "medium", timeLimitSec: 45, hintCount: 2 },
        3: { difficulty: "medium-plus", timeLimitSec: 40, hintCount: 2 },
        4: { difficulty: "hard", timeLimitSec: 35, hintCount: 1 },
        5: { difficulty: "expert", timeLimitSec: 30, hintCount: 1 }
      }
    };
    return specs[gameType]?.[level] || specs.memory[1];
  }

  updatePatientBaseline(gameType, metrics) {
    if (!this.state.baseline) this.state.baseline = {};
    if (!this.state.baseline[gameType]) {
      this.state.baseline[gameType] = { sessions: 0, avg_accuracy: null, avg_rt: null, avg_hints: null, avg_hesitation: null };
    }
    
    if (metrics.completion_status !== "completed") return this.state.baseline[gameType];

    const bl = this.state.baseline[gameType];
    bl.sessions += 1;
    
    const alpha = 0.3; // Exponential moving average weight
    const rt = metrics.average_attempt_duration_ms || metrics.avg_reaction_time_ms || 0;
    
    if (bl.sessions === 1) {
      bl.avg_accuracy = metrics.accuracy;
      bl.avg_rt = rt;
      bl.avg_hints = metrics.hints_used;
      bl.avg_hesitation = metrics.maximum_hesitation_ms || 0;
    } else {
      bl.avg_accuracy = (alpha * metrics.accuracy) + ((1 - alpha) * bl.avg_accuracy);
      bl.avg_rt = (alpha * rt) + ((1 - alpha) * bl.avg_rt);
      bl.avg_hints = (alpha * metrics.hints_used) + ((1 - alpha) * bl.avg_hints);
      bl.avg_hesitation = (alpha * (metrics.maximum_hesitation_ms || 0)) + ((1 - alpha) * bl.avg_hesitation);
    }
    
    this.saveState();
    return bl;
  }

  extractFeatures(metrics, baseline) {
    const accuracy = metrics.accuracy || 0;
    const rt = metrics.average_attempt_duration_ms || metrics.avg_reaction_time_ms || 0;
    const hesitation = metrics.maximum_hesitation_ms || 0;
    
    let baseline_deviation_acc = 0;
    let baseline_deviation_rt = 0;
    
    if (baseline && baseline.sessions >= 3) {
      baseline_deviation_acc = accuracy - baseline.avg_accuracy;
      baseline_deviation_rt = rt - baseline.avg_rt;
    }

    return {
      memory_success_rate: accuracy,
      error_rate: metrics.total_attempts > 0 ? (metrics.incorrect_attempts / metrics.total_attempts) : 0,
      response_speed: rt,
      hesitation_index: hesitation,
      hint_dependence: metrics.hint_limit > 0 ? (metrics.hints_used / metrics.hint_limit) : 0,
      baseline_deviation_acc,
      baseline_deviation_rt
    };
  }

  getFallbackAdaptation(gameType, features, baseline, curLevel, completionStatus) {
    const baselineStatus = (baseline && baseline.sessions >= 3) ? "established" : "developing";
    
    let difficultyAction = "maintain";
    let trainingTarget = "Memory Consolidation";
    let assistanceAction = "Maintain current assistance";
    let reason = "Good effort. Maintaining current level.";

    if (completionStatus === "timeout" || completionStatus === "abandoned") {
      this.state.consecutive_abandoned += 1;
      
      if (this.state.consecutive_abandoned >= 2 && curLevel > 1) {
        difficultyAction = "decrease";
        reason = "Session incomplete. Difficulty eased to maintain comfort.";
        this.state.consecutive_abandoned = 0;
      } else {
        reason = "Session incomplete. Maintaining difficulty.";
      }
      trainingTarget = "Engagement";
      assistanceAction = "Increase time/assistance next round";
    } else {
      // Completed session - Multidimensional Fallback
      if (features.memory_success_rate >= 0.8 && features.response_speed <= 5000) {
        this.state.consecutive_abandoned = 0;
        difficultyAction = "increase";
        reason = "Consistent strong performance. Increasing difficulty.";
        trainingTarget = "Working Memory Load";
      } else if (features.memory_success_rate >= 0.8 && features.response_speed > 6000) {
         this.state.consecutive_abandoned = 0;
         difficultyAction = "maintain";
         reason = "Good accuracy but slow. Focusing on speed.";
         trainingTarget = "Response Efficiency";
      } else if (features.memory_success_rate <= 0.5) {
        this.state.consecutive_abandoned += 1;
        
        if (this.state.consecutive_abandoned >= 2 && curLevel > 1) {
          difficultyAction = "decrease";
          reason = "Challenging round. Easing difficulty to maintain comfort.";
          this.state.consecutive_abandoned = 0;
        } else {
          reason = "Challenging round. Maintaining current level.";
        }
        trainingTarget = "Accuracy and Confidence";
        assistanceAction = "Suggest hints earlier";
      } else {
        this.state.consecutive_abandoned = 0;
        reason = "Moderate performance. Maintaining difficulty.";
      }
    }

    return {
      decision: {
        difficulty_action: difficultyAction,
        primary_training_target: trainingTarget,
        assistance_action: assistanceAction,
        reason: reason
      },
      decision_mode: "adaptive_fallback",
      baseline_status: baselineStatus,
      action: difficultyAction === "increase" ? "level_up" : (difficultyAction === "decrease" ? "level_down" : "maintain")
    };
  }

  async predictAdaptation(gameType, features, baseline, curLevel, completionStatus) {
    let result = this.getFallbackAdaptation(gameType, features, baseline, curLevel, completionStatus);
    
    // Attempt to fetch from backend inference.py ML layer
    try {
        if (window.syncManager && window.syncManager.patientId) {
            const patientId = window.syncManager.patientId;
            // Provide telemetry to the /api/v1/dda/predict endpoint which should hit inference.py
            const response = await fetch(`http://localhost:8000/api/v1/dda/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: patientId,
                    game_type: gameType,
                    features: features,
                    baseline: baseline,
                    current_level: curLevel,
                    completion_status: completionStatus
                })
            });
            if (response.ok) {
                const mlData = await response.json();
                if (mlData && mlData.decision_mode === "ml") {
                    result.decision = mlData.decision;
                    result.decision_mode = "ml";
                    result.action = mlData.decision.difficulty_action === "increase" ? "level_up" : (mlData.decision.difficulty_action === "decrease" ? "level_down" : "maintain");
                }
            }
        }
    } catch(err) {
        console.warn("Backend ML request failed. Using Adaptive Fallback.", err);
    }
    
    // Apply Safety Layer locally if needed, but backend should apply it.
    let nextLevel = curLevel;
    if (result.action === "level_up") nextLevel = Math.min(curLevel + 1, 5);
    if (result.action === "level_down") nextLevel = Math.max(curLevel - 1, 1);
    
    const baseParams = this.getLevelSpecs(gameType, nextLevel);
    
    // Simple mock safety constraint implementation if not from backend
    if (result.decision.primary_training_target === "Response Efficiency") {
        baseParams.timeLimitSec = Math.min(baseParams.timeLimitSec + 10, 60);
    }

    result.next_parameters = baseParams;
    result.currentLevel = nextLevel;
    return result;
  }

  async calculateDDA(gameType, accuracyOrMetrics, reactionTimeMs, hintsUsed, completionStatus = "completed") {
    let metrics = {};
    if (typeof accuracyOrMetrics === "number") {
      metrics = {
        accuracy: accuracyOrMetrics,
        average_attempt_duration_ms: reactionTimeMs,
        hints_used: hintsUsed,
        completion_status: completionStatus,
        hint_limit: 3,
        total_attempts: 10,
        incorrect_attempts: Math.round((1 - accuracyOrMetrics) * 10)
      };
    } else {
        metrics = accuracyOrMetrics;
    }
    
    return await this._orchestrateDDA(gameType, metrics);
  }

  async _orchestrateDDA(gameType, metrics) {
    const curLevel = this.state.levels[gameType] || 1;
    const completionStatus = metrics.completion_status || "completed";
    
    const baseline = this.updatePatientBaseline(gameType, metrics);
    const features = this.extractFeatures(metrics, baseline);
    
    const result = await this.predictAdaptation(gameType, features, baseline, curLevel, completionStatus);
    
    this.state.levels[gameType] = result.currentLevel;
    this.state.configs[gameType] = result.next_parameters;
    this.saveState();
    
    result.message = result.decision.reason;
    result.params = result.next_parameters;
    
    return result;
  }

  getCurrentLevel(gameType) {
    return this.state.levels[gameType] || 2;
  }
}

const onDeviceDDA = new OnDeviceDDA();
