// Mini-Game 1: Memory Pairs (স্মৃতি খেল)
class MemoryGame {
  constructor(containerId, onComplete) {
    this.container = document.getElementById(containerId);
    this.onComplete = onComplete;
    this.cards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.totalPairs = 4;
    this.startTime = null;
    this.totalMoves = 0;
    this.hintsUsed = 0;
    this.timerInterval = null;
    this.timeLimitSec = 60;
    this.timeRemaining = 60;
    this.isLocked = false;
    
    this.totalCardSelections = 0;
    this.totalAttempts = 0;
    this.correctAttempts = 0;
    this.incorrectAttempts = 0;
    this.sessionEnded = false;
    this.attemptHistory = [];
    this.hintEvents = [];
    this.gridCols = 4;
    this.hintLimit = 3;
    
    this.timeToFirstActionMs = null;
    this.lastActionTimeMs = null;
    this.maximumHesitationMs = 0;
    this.hesitationCount = 0;
    
    // Cultural NER Motifs with high-contrast distinct SVG icons
    this.motifs = [
      { id: "japi", name: "Assamese Japi", emoji: "👒", icon: "https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/roofing/default/48px.svg", color: "#f59e0b" },
      { id: "hornbill", name: "Great Hornbill", emoji: "🪶", icon: "https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/raven/default/48px.svg", color: "#ef4444" },
      { id: "rhino", name: "One-Horned Rhino", emoji: "🦏", icon: "https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/cruelty_free/default/48px.svg", color: "#06b6d4" },
      { id: "dhol", name: "Bihu Dhol Drum", emoji: "🥁", icon: "https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/music_note/default/48px.svg", color: "#ec4899" },
      { id: "bamboo", name: "Mizo Bamboo Craft", emoji: "🎋", icon: "https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/yard/default/48px.svg", color: "#10b981" },
      { id: "tea", name: "Assam Tea Leaf", emoji: "🍃", icon: "https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/eco/default/48px.svg", color: "#84cc16" },
    ];
  }

  start(level = 2) {
    this.level = level;
    const specs = onDeviceDDA.getLevelSpecs("memory", level);
    this.totalPairs = specs.cardCount / 2;
    this.timeLimitSec = specs.timeLimitSec;
    this.hintLimit = specs.hintCount;
    this.gridCols = specs.gridCols || 4;
    this.timeRemaining = this.timeLimitSec;
    this.matchedPairs = 0;
    this.flippedCards = [];
    this.totalMoves = 0;
    this.totalCardSelections = 0;
    this.totalAttempts = 0;
    this.correctAttempts = 0;
    this.incorrectAttempts = 0;
    this.hintsUsed = 0;
    this.sessionEnded = false;
    this.attemptHistory = [];
    this.hintEvents = [];
    this.isLocked = false;
    this.timeToFirstActionMs = null;
    this.lastActionTimeMs = null;
    this.maximumHesitationMs = 0;
    this.hesitationCount = 0;
    this.startTime = Date.now();

    voiceService.speak("memory_intro");
    this.render();
    this.startTimer();
  }

  render() {
    // Select motifs for this round
    // Select motifs for this round
    const shuffledMotifs = [...this.motifs].sort(() => Math.random() - 0.5); // Simplified shuffle for motifs
    const selectedMotifs = shuffledMotifs.slice(0, this.totalPairs);
    const cardPool = [...selectedMotifs, ...selectedMotifs];
    
    // Fisher-Yates Shuffle
    for (let i = cardPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardPool[i], cardPool[j]] = [cardPool[j], cardPool[i]];
    }
    
    this.cards = cardPool.map((m, idx) => ({
      uniqueId: idx,
      motifId: m.id,
      name: m.name,
      emoji: m.emoji,
      color: m.color,
      isFlipped: false,
      isMatched: false
    }));

    // Use specs gridCols if possible, fallback to current logic
    const gridCols = this.gridCols;
    const colsClass = gridCols === 2 ? 'grid-cols-2 md:grid-cols-2' : 
                      gridCols === 3 ? 'grid-cols-3 md:grid-cols-3' : 
                      gridCols === 5 ? 'grid-cols-5 md:grid-cols-5' : 'grid-cols-4 md:grid-cols-4';

    this.container.innerHTML = `
      <div class="flex flex-col gap-stack-gap">
        <!-- Game Header Section -->
        <section class="flex flex-col gap-4 bg-surface-container p-6 rounded-xl border-4 border-outline-variant">
          <div class="flex justify-between items-center w-full">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-primary text-4xl" style="font-variation-settings: 'FILL' 1;">star</span>
              <span class="font-body-xl text-body-xl text-on-surface font-bold">${voiceService.getTranslation("level")} ${this.level}</span>
            </div>
            <div class="bg-surface-container-high px-6 py-2 rounded-full border-2 border-outline">
              <span id="memory-pairs-counter" class="font-body-lg text-body-lg text-on-surface-variant font-bold">
                ${voiceService.getTranslation("pairs_found")}: 0/${this.totalPairs}
              </span>
            </div>
          </div>
          
          <!-- Countdown Progress Bar -->
          <div class="w-full bg-surface-container-highest h-4 rounded-full overflow-hidden border border-outline">
            <div id="memory-timer-bar" class="bg-tertiary h-full rounded-full transition-all duration-1000" style="width: 100%;"></div>
          </div>

          <!-- Hint Button -->
          <button id="btn-memory-hint" class="h-touch-target-primary w-full bg-secondary-container hover:bg-secondary-fixed transition-colors text-on-surface rounded-xl border-4 border-outline flex items-center justify-center gap-4 active:scale-95">
            <span class="material-symbols-outlined text-[40px]" style="font-variation-settings: 'FILL' 1;">lightbulb</span>
            <span class="font-headline-lg text-headline-lg font-bold">${voiceService.getTranslation("hint")}</span>
          </button>
        </section>

        <!-- Memory Grid Board -->
        <section id="memory-grid-board" class="grid ${colsClass} gap-4 flex-grow content-center">
          ${this.cards.map((card) => `
            <button data-card-id="${card.uniqueId}" aria-label="Card ${card.uniqueId + 1}" class="flip-card h-[130px] md:h-[150px] w-full rounded-xl focus:outline-none focus:ring-4 focus:ring-primary cursor-pointer active:scale-95 transition-transform">
              <div class="flip-card-inner relative w-full h-full text-center">
                <!-- Front (Hidden State) -->
                <div class="flip-card-front absolute w-full h-full bg-surface-container-high hover:bg-secondary-container transition-colors rounded-xl border-4 border-outline flex items-center justify-center">
                  <span class="material-symbols-outlined text-[64px] text-primary">help</span>
                </div>
                <!-- Back (Revealed State) -->
                <div class="flip-card-back absolute w-full h-full bg-primary-container rounded-xl border-4 border-primary flex flex-col items-center justify-center p-2" style="background-color: ${card.color}22; border-color: ${card.color};">
                  <span class="text-6xl mb-1">${card.emoji}</span>
                  <span class="font-bold text-sm text-on-surface line-clamp-1">${card.name}</span>
                </div>
              </div>
            </button>
          `).join('')}
        </section>

        <!-- Bottom Game Controls -->
        <section class="flex flex-col gap-4 mt-auto pt-2">
          <button id="btn-memory-hear" class="h-touch-target-primary w-full bg-primary hover:bg-primary-fixed transition-colors text-on-primary rounded-xl border-4 border-on-primary-fixed flex items-center justify-center gap-4 active:scale-95">
            <span class="material-symbols-outlined text-[32px]" style="font-variation-settings: 'FILL' 1;">volume_up</span>
            <span class="font-body-xl text-body-xl font-bold">${voiceService.getTranslation("hear_instruction")}</span>
          </button>
          <button id="btn-memory-exit" class="h-touch-target-min w-full bg-error-container hover:bg-error transition-colors text-on-error-container hover:text-on-error rounded-xl border-4 border-on-error flex items-center justify-center gap-4 active:scale-95">
            <span class="material-symbols-outlined text-[28px]" style="font-variation-settings: 'FILL' 1;">exit_to_app</span>
            <span class="font-body-lg text-body-lg font-bold">${voiceService.getTranslation("exit_game")}</span>
          </button>
        </section>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const cardBtns = this.container.querySelectorAll('.flip-card');
    cardBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.cardId);
        this.flipCard(id, btn);
      });
    });

    document.getElementById('btn-memory-hint')?.addEventListener('click', () => this.useHint());
    document.getElementById('btn-memory-hear')?.addEventListener('click', () => voiceService.speak("memory_intro"));
    document.getElementById('btn-memory-exit')?.addEventListener('click', () => this.exitGame());
  }

  _recordActionTime() {
    const now = Date.now();
    if (!this.timeToFirstActionMs) {
      this.timeToFirstActionMs = now - this.startTime;
    }
    if (this.lastActionTimeMs) {
      const delay = now - this.lastActionTimeMs;
      if (delay > this.maximumHesitationMs) {
        this.maximumHesitationMs = delay;
      }
      if (delay > 3000) {
        this.hesitationCount += 1;
      }
    }
    this.lastActionTimeMs = now;
  }

  flipCard(id, cardEl) {
    if (this.isLocked || this.sessionEnded) return;
    const card = this.cards.find(c => c.uniqueId === id);
    if (!card || card.isFlipped || card.isMatched) return;

    this._recordActionTime();

    this.totalCardSelections += 1;
    card.isFlipped = true;
    cardEl.classList.add('flipped');
    
    this.flippedCards.push({ 
      card, 
      cardEl, 
      selectedAt: performance.now() 
    });

    if (this.flippedCards.length === 2) {
      this.totalMoves += 1;
      this.checkMatch();
    }
  }

  checkMatch() {
    const [first, second] = this.flippedCards;
    this.isLocked = true;
    this.totalAttempts += 1;

    const attemptDurationMs = Math.max(0, second.selectedAt - first.selectedAt);
    const isMatch = first.card.motifId === second.card.motifId;

    if (isMatch) {
      this.correctAttempts += 1;
    } else {
      this.incorrectAttempts += 1;
    }

    this.attemptHistory.push({
      attempt_number: this.totalAttempts,
      first_card_id: first.card.uniqueId,
      second_card_id: second.card.uniqueId,
      first_motif_id: first.card.motifId,
      second_motif_id: second.card.motifId,
      started_at: first.selectedAt,
      completed_at: second.selectedAt,
      attempt_duration_ms: attemptDurationMs,
      is_match: isMatch,
      is_error: !isMatch
    });

    if (isMatch) {
      // Match found!
      first.card.isMatched = true;
      second.card.isMatched = true;
      this.matchedPairs += 1;
      
      // Update Counter
      const counter = document.getElementById("memory-pairs-counter");
      if (counter) counter.innerText = `${voiceService.getTranslation("pairs_found")}: ${this.matchedPairs}/${this.totalPairs}`;

      this.flippedCards = [];
      this.isLocked = false;

      // Soft haptic feedback
      if (navigator.vibrate) navigator.vibrate(80);

      if (this.matchedPairs === this.totalPairs) {
        this.handleGameComplete();
      }
    } else {
      // No match -> Flip back after 900ms
      // Add a visual cue before flipping back (gentle state)
      first.cardEl.classList.add('ring-4', 'ring-error');
      second.cardEl.classList.add('ring-4', 'ring-error');
      
      setTimeout(() => {
        first.card.isFlipped = false;
        second.card.isFlipped = false;
        first.cardEl.classList.remove('flipped', 'ring-4', 'ring-error');
        second.cardEl.classList.remove('flipped', 'ring-4', 'ring-error');
        this.flippedCards = [];
        this.isLocked = false;
      }, 900);
    }
  }

  useHint() {
    if (this.isLocked || this.sessionEnded || this.hintsUsed >= this.hintLimit) return;
    
    this._recordActionTime();

    // Find an unmatched pair
    const unmatchedCards = this.cards.filter(c => !c.isMatched && !c.isFlipped);
    if (unmatchedCards.length < 2) return;
    
    // Just pick the first unmatched card's pair
    const targetMotif = unmatchedCards[0].motifId;
    const pairToReveal = unmatchedCards.filter(c => c.motifId === targetMotif).slice(0, 2);
    
    if (pairToReveal.length === 2) {
      this.hintsUsed += 1;
      this.hintEvents.push({
        hint_number: this.hintsUsed,
        timestamp: Date.now(),
        type: "reveal_pair"
      });

      const elements = pairToReveal.map(c => this.container.querySelector(`.flip-card[data-card-id="${c.uniqueId}"]`));
      
      elements.forEach(el => el.classList.add('flipped'));

      setTimeout(() => {
        elements.forEach(el => {
          const id = parseInt(el.dataset.cardId);
          const card = this.cards.find(c => c.uniqueId === id);
          if (card && !card.isMatched) {
            el.classList.remove('flipped');
          }
        });
      }, 1500);
    }
  }

  startTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timeRemaining -= 1;
      const bar = document.getElementById("memory-timer-bar");
      if (bar) {
        const pct = Math.max(0, (this.timeRemaining / this.timeLimitSec) * 100);
        bar.style.width = `${pct}%`;
      }

      if (this.timeRemaining <= 0) {
        clearInterval(this.timerInterval);
        this.handleTimeout();
      }
    }, 1000);
  }

  calculateSessionMetrics(completionStatus) {
    const endedAt = Date.now();
    const actualDurationMs = endedAt - this.startTime;
    const accuracy = this.totalAttempts > 0 ? Number((this.correctAttempts / this.totalAttempts).toFixed(2)) : 0;
    
    const reactionTimes = this.attemptHistory.map(a => a.attempt_duration_ms).filter(t => t > 0);
    let avgReactionTime = null, medianReactionTime = null, minReactionTime = null, maxReactionTime = null;
    
    if (reactionTimes.length > 0) {
      const sum = reactionTimes.reduce((a, b) => a + b, 0);
      avgReactionTime = Math.round(sum / reactionTimes.length);
      minReactionTime = Math.min(...reactionTimes);
      maxReactionTime = Math.max(...reactionTimes);
      
      const sorted = [...reactionTimes].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medianReactionTime = sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    }
    
    const score = Math.max(0, (this.correctAttempts * 10) - (this.incorrectAttempts * 2) - (this.hintsUsed * 5));

    return {
      game_type: "memory",
      difficulty_level: this.level,
      
      card_count: this.cards.length,
      pair_count: this.totalPairs,
      time_limit_sec: this.timeLimitSec,
      
      pairs_completed: this.matchedPairs,
      
      total_card_selections: this.totalCardSelections,
      total_attempts: this.totalAttempts,
      correct_attempts: this.correctAttempts,
      incorrect_attempts: this.incorrectAttempts,
      accuracy: accuracy,
      score: score,
      
      actual_duration_ms: actualDurationMs,
      
      avg_reaction_time_ms: avgReactionTime || 0,
      median_reaction_time_ms: medianReactionTime,
      min_reaction_time_ms: minReactionTime,
      max_reaction_time_ms: maxReactionTime,
      average_attempt_duration_ms: avgReactionTime,
      fastest_attempt_time_ms: minReactionTime,
      slowest_attempt_time_ms: maxReactionTime,
      
      time_to_first_action_ms: this.timeToFirstActionMs,
      maximum_hesitation_ms: this.maximumHesitationMs,
      hesitation_count: this.hesitationCount,
      
      hints_used: this.hintsUsed,
      hint_limit: this.hintLimit,
      
      completion_status: completionStatus,
      rounds_completed: 1,
      started_at: new Date(this.startTime).toISOString(),
      ended_at: new Date(endedAt).toISOString(),
      
      attempt_history: this.attemptHistory,
      hint_events: this.hintEvents
    };
  }

  async handleGameComplete() {
    if (this.sessionEnded) return;
    this.sessionEnded = true;
    clearInterval(this.timerInterval);
    
    const metrics = this.calculateSessionMetrics("completed");

    // On-device DDA calculation (AI-Ready Architecture)
    const ddaResult = await onDeviceDDA.calculateDDA("memory", metrics);

    console.log("========== DEVELOPER DIAGNOSTIC ==========");
    console.log("Decision Mode:", ddaResult.decision_mode);
    console.log("Action:", ddaResult.decision.difficulty_action);
    console.log("Target:", ddaResult.decision.primary_training_target);
    console.log("Next Level:", ddaResult.currentLevel);
    console.log("Next Config:", ddaResult.params);
    console.log("==========================================");

    await localDB.saveGameSession(metrics);

    voiceService.speak("game_complete");
    this.showCompletionModal(metrics, ddaResult, false);

    // Trigger opportunistic background sync
    syncManager.attemptSync();
  }

  async handleTimeout() {
    if (this.sessionEnded) return;
    this.sessionEnded = true;
    clearInterval(this.timerInterval);

    const metrics = this.calculateSessionMetrics("timeout");
    
    // On-device DDA calculation (AI-Ready Architecture)
    const ddaResult = await onDeviceDDA.calculateDDA("memory", metrics);

    await localDB.saveGameSession(metrics);

    this.showCompletionModal(metrics, ddaResult, true);
    syncManager.attemptSync();
  }

  showCompletionModal(metrics, ddaResult, isTimeout = false) {
    const modal = document.createElement("div");
    modal.className = "fixed inset-0 z-50 flex items-center justify-center bg-surface/95 backdrop-blur-md px-margin-page overflow-y-auto";
    
    let btnText = `Play Next Round (Level ${ddaResult.currentLevel})`;
    let titleText = isTimeout ? 'Time Expired' : voiceService.getTranslation('game_complete');
    let messageText = "Good effort!";
    
    if (ddaResult.action === "level_up") {
      btnText = `Continue — Level ${ddaResult.currentLevel}`;
      messageText = "Great work!";
    } else if (ddaResult.action === "maintain") {
      btnText = `Play Again — Level ${ddaResult.currentLevel}`;
      messageText = "Good effort!";
    } else if (ddaResult.action === "level_down" || ddaResult.action === "frustration_guard") {
      btnText = `Try Easier Round — Level ${ddaResult.currentLevel}`;
      messageText = "Let's make the next round a little easier.";
    }

    // Safely extract performance profile
    const profile = ddaResult.performance_profile || {};

    modal.innerHTML = `
      <div class="w-full max-w-xl bg-surface-container-high rounded-3xl border-4 border-primary p-8 flex flex-col items-center text-center gap-6 shadow-2xl my-8">
        <span class="text-7xl">${isTimeout ? '⏰' : '🎉'}</span>
        <h2 class="font-headline-lg text-headline-lg text-on-surface font-bold">
          ${titleText}
        </h2>
        <p class="font-headline-md text-primary font-bold">${messageText}</p>
        
        <div class="grid grid-cols-2 gap-4 w-full bg-surface-container p-4 rounded-xl border-2 border-outline">
          <div class="flex flex-col items-center justify-center p-2">
            <p class="text-on-surface-variant font-bold text-sm uppercase tracking-wider">Score</p>
            <p class="font-headline-lg text-primary font-bold">${metrics.score || 0}</p>
          </div>
          <div class="flex flex-col items-center justify-center p-2">
            <p class="text-on-surface-variant font-bold text-sm uppercase tracking-wider">Accuracy</p>
            <p class="font-headline-lg text-primary font-bold">${Math.round(metrics.accuracy * 100)}%</p>
          </div>
          <div class="col-span-2 grid grid-cols-3 gap-2 border-t-2 border-outline pt-4">
             <div class="flex flex-col items-center text-sm">
                <span class="text-on-surface-variant">Attempts</span>
                <span class="font-bold text-on-surface">${metrics.total_attempts}</span>
             </div>
             <div class="flex flex-col items-center text-sm">
                <span class="text-on-surface-variant">Correct</span>
                <span class="font-bold text-emerald-500">${metrics.correct_attempts}</span>
             </div>
             <div class="flex flex-col items-center text-sm">
                <span class="text-on-surface-variant">Hints</span>
                <span class="font-bold text-amber-500">${metrics.hints_used}</span>
             </div>
          </div>
        </div>

        <div class="w-full bg-secondary-container rounded-xl p-4 text-left border-2 border-secondary">
           <h3 class="font-bold text-on-secondary-container mb-2">Performance Summary</h3>
           <ul class="text-on-secondary-container space-y-1">
             <li><span class="font-bold">Memory:</span> ${profile.memory || 'Good'}</li>
             <li><span class="font-bold">Response:</span> ${profile.response_speed || 'Steady'}</li>
             <li><span class="font-bold">Effort:</span> ${profile.perseverance_indicator || 'Good'}</li>
           </ul>
        </div>
        
        <div class="flex flex-col gap-3 w-full mt-2">
          <button id="btn-next-level" class="h-touch-target-primary w-full bg-[#059669] hover:bg-[#047857] text-white rounded-xl border-4 border-[#047857] flex items-center justify-center gap-4 font-body-xl font-bold active:scale-95">
            <span class="material-symbols-outlined text-4xl">play_arrow</span>
            <span>${btnText}</span>
          </button>
          <button id="btn-return-home" class="h-touch-target-min w-full bg-surface-container hover:bg-secondary-container text-on-surface rounded-xl border-2 border-outline flex items-center justify-center gap-4 font-body-lg font-bold active:scale-95">
            <span class="material-symbols-outlined text-2xl">home</span>
            <span>${voiceService.getTranslation('home')}</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-next-level').addEventListener('click', () => {
      modal.remove();
      this.start(ddaResult.currentLevel);
    });

    modal.querySelector('#btn-return-home').addEventListener('click', () => {
      modal.remove();
      this.exitGame();
    });
  }

  async exitGame() {
    if (this.sessionEnded) {
      if (this.onComplete) this.onComplete();
      return;
    }
    this.sessionEnded = true;
    clearInterval(this.timerInterval);
    
    const metrics = this.calculateSessionMetrics("abandoned");
    
    // Explicit exit means abandoned. Don't show modal, just save and exit.
    await localDB.saveGameSession(metrics);
    syncManager.attemptSync();

    if (this.onComplete) this.onComplete();
  }
}
