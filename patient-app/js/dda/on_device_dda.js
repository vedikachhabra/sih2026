// On-Device Dynamic Difficulty Adjustment (DDA) Engine
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
        weights: { w1: 0.55, w2: 0.30, w3: 0.15 },
        thresholds: { up: 0.75, down: 0.40 },
        levels: { memory: 2, attention: 2, sequencing: 2, pattern: 2 },
        consecutive_abandoned: 0,
        stable_sessions: 0
      };
      this.saveState();
    }
  }

  saveState() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
  }

  // Parameter specs per level
  getLevelSpecs(gameType, level) {
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

  calculateDDA(gameType, accuracy, reactionTimeMs, hintsUsed, completionStatus = "completed") {
    const curLevel = this.state.levels[gameType] || 2;
    let nextLevel = curLevel;
    let action = "maintain";
    let message = "Maintaining flow state.";
    let timeScale = 1.0;

    const rtMaxMap = { memory: 4500, attention: 3500, sequencing: 5000, pattern: 4000 };
    const rtMax = rtMaxMap[gameType] || 4000;

    // 1. Frustration Guard Check (F >= 2)
    if (completionStatus === "abandoned" || completionStatus === "timeout") {
      this.state.consecutive_abandoned += 1;
      if (this.state.consecutive_abandoned >= 2) {
        nextLevel = Math.max(1, curLevel - 2);
        this.state.consecutive_abandoned = 0;
        timeScale = 1.5;
        action = "frustration_guard";
        message = "Frustration Guard: Difficulty eased by 2 levels, time extended by 1.5x with visual cues.";
      }
    } else {
      this.state.consecutive_abandoned = 0;

      // 2. Clinical Flow State Performance Index:
      // Pt = 0.5 * At + 0.3 * max(0, 1 - RTt/RTmax) - 0.2 * (Ht / Hmax)
      const rtScore = Math.max(0.0, 1.0 - (reactionTimeMs / rtMax));
      const hintPenalty = Math.min(1.0, hintsUsed / 3.0);
      const pt = (0.5 * accuracy) + (0.3 * rtScore) - (0.2 * hintPenalty);

      const eta = 0.10;
      const pTarget = 0.70;
      const delta = eta * (pt - pTarget);

      if (pt >= 0.75 && curLevel < 5) {
        nextLevel = curLevel + 1;
        action = "level_up";
        message = `High flow performance (Pt=${pt.toFixed(2)}). Level increased to ${nextLevel}.`;
      } else if (pt <= 0.45 && curLevel > 1) {
        nextLevel = curLevel - 1;
        action = "level_down";
        message = `Performance eased to Level ${nextLevel} to maintain comfort.`;
      }
    }

    this.state.levels[gameType] = nextLevel;
    this.saveState();

    const baseParams = this.getLevelSpecs(gameType, nextLevel);
    const adjustedParams = { ...baseParams, timeLimitSec: Math.round(baseParams.timeLimitSec * timeScale) };

    return {
      currentLevel: nextLevel,
      action: action,
      message: message,
      params: adjustedParams
    };
  }

  getCurrentLevel(gameType) {
    return this.state.levels[gameType] || 2;
  }
}

const onDeviceDDA = new OnDeviceDDA();
