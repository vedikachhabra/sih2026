class MemoryRLAgent {
  constructor(patientId) {
    this.patientId = patientId || 'default_patient';
    this.storageKey = `memory_rl_model_${this.patientId}`;
    
    // Hyperparameters
    this.learningRate = 0.15; // Alpha
    this.discountFactor = 0.80; // Gamma
    this.epsilonMin = 0.05;
    this.epsilonDecay = 0.99;
    
    // Level configurations bounds
    this.LEVEL_CONFIGS = {
      1: { pairs: 2, time_limit_sec: 60, hints: 3 },
      2: { pairs: 3, time_limit_sec: 55, hints: 2 },
      3: { pairs: 4, time_limit_sec: 50, hints: 2 },
      4: { pairs: 5, time_limit_sec: 45, hints: 1 },
      5: { pairs: 6, time_limit_sec: 40, hints: 1 },
    };

    this.loadState();
  }

  loadState() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.qTable = parsed.qTable || {};
        this.episode = parsed.episode || 0;
        this.epsilon = parsed.epsilon !== undefined ? parsed.epsilon : 0.25;
        this.lastAction = parsed.lastAction || null;
        this.lastState = parsed.lastState || null;
      } else {
        this.initDefaultState();
      }
    } catch (err) {
      console.warn("Failed to load RL state, resetting.", err);
      this.initDefaultState();
    }
  }

  initDefaultState() {
    this.qTable = {};
    this.episode = 0;
    this.epsilon = 0.25;
    this.lastAction = null;
    this.lastState = null;
    this.saveState();
  }

  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        qTable: this.qTable,
        episode: this.episode,
        epsilon: this.epsilon,
        lastAction: this.lastAction,
        lastState: this.lastState
      }));
    } catch (err) {
      console.warn("Failed to save RL state to localStorage.", err);
    }
  }

  // Define the safe action space for a given level
  getValidActions(currentLevel) {
    const actions = [];
    
    // Allow level down if > 1
    if (currentLevel > 1) {
      actions.push({ id: `level_${currentLevel - 1}_standard`, level: currentLevel - 1, type: 'standard' });
      actions.push({ id: `level_${currentLevel - 1}_more_time`, level: currentLevel - 1, type: 'more_time' });
      actions.push({ id: `level_${currentLevel - 1}_more_hints`, level: currentLevel - 1, type: 'more_hints' });
    }
    
    // Allow maintain level
    actions.push({ id: `level_${currentLevel}_standard`, level: currentLevel, type: 'standard' });
    actions.push({ id: `level_${currentLevel}_more_time`, level: currentLevel, type: 'more_time' });
    actions.push({ id: `level_${currentLevel}_more_hints`, level: currentLevel, type: 'more_hints' });

    // Allow level up if < 5
    if (currentLevel < 5) {
      actions.push({ id: `level_${currentLevel + 1}_standard`, level: currentLevel + 1, type: 'standard' });
      actions.push({ id: `level_${currentLevel + 1}_more_time`, level: currentLevel + 1, type: 'more_time' });
      actions.push({ id: `level_${currentLevel + 1}_more_hints`, level: currentLevel + 1, type: 'more_hints' });
    }

    return actions;
  }

  // Convert an action ID to a concrete game configuration
  actionToConfig(actionId) {
    const parts = actionId.split('_');
    const level = parseInt(parts[1], 10);
    const type = parts.slice(2).join('_');
    
    const base = this.LEVEL_CONFIGS[level];
    if (!base) return null; // Fallback safety

    let config = { level, pairs: base.pairs, time_limit_sec: base.time_limit_sec, hints: base.hints };

    if (type === 'more_time') {
      config.time_limit_sec = Math.min(90, Math.floor(base.time_limit_sec * 1.15));
    } else if (type === 'more_hints') {
      config.hints = Math.min(3, base.hints + 1);
    }

    return config;
  }

  // State discretizer
  encodeState(metrics) {
    let accBand = "acc_low";
    if (metrics.accuracy >= 0.8) accBand = "acc_high";
    else if (metrics.accuracy >= 0.5) accBand = "acc_med";

    const errorRate = metrics.total_attempts > 0 ? metrics.incorrect_attempts / metrics.total_attempts : 0;
    let errBand = "err_high";
    if (errorRate < 0.2) errBand = "err_low";
    else if (errorRate < 0.5) errBand = "err_med";

    let compBand = "comp_part";
    if (metrics.pairs_completed === metrics.pair_count) compBand = "comp_full";
    if (metrics.completion_status !== 'completed') compBand = "comp_fail";

    const hintRatio = metrics.hint_limit > 0 ? metrics.hints_used / metrics.hint_limit : 0;
    let hintBand = "hints_many";
    if (hintRatio === 0) hintBand = "hints_none";
    else if (hintRatio <= 0.5) hintBand = "hints_few";

    let hesBand = "hes_low";
    if (metrics.maximum_hesitation_ms > 3000) hesBand = "hes_high";

    return `${accBand}|${errBand}|${compBand}|${hintBand}|${hesBand}|L${metrics.difficulty_level}`;
  }

  // Bounded reward function [-1, 1]
  calculateReward(metrics) {
    const accuracy = metrics.accuracy || 0;
    const errorRate = metrics.total_attempts > 0 ? metrics.incorrect_attempts / metrics.total_attempts : 0;
    const completionEfficiency = metrics.pair_count > 0 ? metrics.pairs_completed / metrics.pair_count : 0;
    const hintDependence = metrics.hint_limit > 0 ? metrics.hints_used / metrics.hint_limit : 0;
    const hesitationNorm = Math.min(1.0, (metrics.maximum_hesitation_ms || 0) / 5000.0);
    const abandoned = (metrics.completion_status === "abandoned" || metrics.completion_status === "timeout") ? 1.0 : 0.0;

    // "Flow" score peaks around 75% accuracy (challenging but achievable)
    const flowScore = Math.max(0.0, 1.0 - Math.abs(accuracy - 0.75) / 0.75);

    let reward = (
        0.35 * flowScore
        + 0.25 * (1.0 - errorRate)
        + 0.20 * completionEfficiency
        - 0.15 * hintDependence
        - 0.10 * hesitationNorm
        - 0.50 * abandoned
    );

    return Math.max(-1.0, Math.min(1.0, Number(reward.toFixed(4))));
  }

  getQValue(state, actionId) {
    if (!this.qTable[state]) this.qTable[state] = {};
    if (this.qTable[state][actionId] === undefined) {
      this.qTable[state][actionId] = 0.0;
    }
    return this.qTable[state][actionId];
  }

  setQValue(state, actionId, value) {
    if (!this.qTable[state]) this.qTable[state] = {};
    this.qTable[state][actionId] = value;
  }

  // Select action via epsilon-greedy
  selectAction(state, currentLevel) {
    const validActions = this.getValidActions(currentLevel);
    let selectedActionId = null;
    let mode = '';

    if (Math.random() < this.epsilon) {
      // Explore
      const randomAction = validActions[Math.floor(Math.random() * validActions.length)];
      selectedActionId = randomAction.id;
      mode = 'RL_EXPLORE';
    } else {
      // Exploit
      let bestValue = -Infinity;
      const bestActions = [];

      for (const action of validActions) {
        const qVal = this.getQValue(state, action.id);
        if (qVal > bestValue) {
          bestValue = qVal;
          bestActions.length = 0;
          bestActions.push(action.id);
        } else if (Math.abs(qVal - bestValue) < 1e-6) {
          bestActions.push(action.id);
        }
      }
      
      // Tie-breaking
      selectedActionId = bestActions[Math.floor(Math.random() * bestActions.length)];
      mode = 'RL_EXPLOIT';
    }

    return { id: selectedActionId, mode };
  }

  // Core learning loop
  learnFromSession(metrics) {
    this.episode += 1;
    const currentState = this.encodeState(metrics);
    const reward = this.calculateReward(metrics);

    let qOld = 0;
    let target = reward;

    if (this.lastState && this.lastAction) {
      qOld = this.getQValue(this.lastState, this.lastAction);
      
      // Get max Q for next state (currentState here is S')
      const validActionsForNextState = this.getValidActions(metrics.difficulty_level);
      let maxQNext = -Infinity;
      for (const act of validActionsForNextState) {
        const val = this.getQValue(currentState, act.id);
        if (val > maxQNext) maxQNext = val;
      }
      if (maxQNext === -Infinity) maxQNext = 0;

      target = reward + this.discountFactor * maxQNext;
      const qNew = qOld + this.learningRate * (target - qOld);
      this.setQValue(this.lastState, this.lastAction, qNew);
      
      console.log(`[MEMORY RL] Q UPDATE: Q(${this.lastState}, ${this.lastAction}) = ${qOld.toFixed(4)} -> ${qNew.toFixed(4)}`);
    }

    // Select next action
    const { id: nextActionId, mode } = this.selectAction(currentState, metrics.difficulty_level);
    const nextConfig = this.actionToConfig(nextActionId);

    // Update Epsilon
    if (this.epsilon > this.epsilonMin) {
      this.epsilon *= this.epsilonDecay;
      if (this.epsilon < this.epsilonMin) this.epsilon = this.epsilonMin;
    }

    // Store state for next iteration
    this.lastState = currentState;
    this.lastAction = nextActionId;
    this.saveState();

    console.log(`[MEMORY RL] ROUND COMPLETE (Episode ${this.episode})`);
    console.log(`[MEMORY RL] STATE: ${currentState}`);
    console.log(`[MEMORY RL] REWARD: ${reward}`);
    console.log(`[MEMORY RL] EPSILON: ${this.epsilon.toFixed(3)}`);
    console.log(`[MEMORY RL] SELECTED ACTION: ${nextActionId} (${mode})`);
    console.log(`[MEMORY RL] NEXT CONFIG:`, nextConfig);

    return {
      model_name: "Local Q-Learning Agent",
      model_status: "Learning on device",
      training_observations: this.episode,
      reward_from_previous_session: reward,
      candidates_evaluated: this.getValidActions(metrics.difficulty_level).map(a => a.id),
      predicted_outcomes: this.getValidActions(metrics.difficulty_level).reduce((acc, a) => {
        acc[a.id] = this.getQValue(currentState, a.id);
        return acc;
      }, {}),
      selected_candidate: nextActionId,
      selection_mode: mode,
      safety_adjustment: "none",
      final_configuration: nextConfig
    };
  }

  // For initial launch when we have no metrics yet
  getInitialConfig() {
    if (this.lastAction) {
      return { config: this.actionToConfig(this.lastAction), aiResult: null }; // Continue from where left off
    }
    // Cold start
    const coldStartAction = "level_1_standard";
    this.lastAction = coldStartAction;
    this.saveState();
    return { config: this.actionToConfig(coldStartAction), aiResult: null };
  }
}
