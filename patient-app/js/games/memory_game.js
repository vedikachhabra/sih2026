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
    this.timeRemaining = this.timeLimitSec;
    this.matchedPairs = 0;
    this.flippedCards = [];
    this.totalMoves = 0;
    this.hintsUsed = 0;
    this.isLocked = false;
    this.startTime = Date.now();

    voiceService.speak("memory_intro");
    this.render();
    this.startTimer();
  }

  render() {
    // Select motifs for this round
    const selectedMotifs = this.motifs.slice(0, this.totalPairs);
    const cardPool = [...selectedMotifs, ...selectedMotifs];
    // Shuffle
    this.cards = cardPool.sort(() => Math.random() - 0.5).map((m, idx) => ({
      uniqueId: idx,
      motifId: m.id,
      name: m.name,
      emoji: m.emoji,
      color: m.color,
      isFlipped: false,
      isMatched: false
    }));

    const colsClass = this.cards.length <= 4 ? 'grid-cols-2' : (this.cards.length <= 8 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3 md:grid-cols-4');

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

  flipCard(id, cardEl) {
    if (this.isLocked) return;
    const card = this.cards.find(c => c.uniqueId === id);
    if (!card || card.isFlipped || card.isMatched) return;

    // Flip visually
    card.isFlipped = true;
    cardEl.classList.add('flipped');
    this.flippedCards.push({ card, cardEl });

    if (this.flippedCards.length === 2) {
      this.totalMoves += 1;
      this.checkMatch();
    }
  }

  checkMatch() {
    const [first, second] = this.flippedCards;
    this.isLocked = true;

    if (first.card.motifId === second.card.motifId) {
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
      setTimeout(() => {
        first.card.isFlipped = false;
        second.card.isFlipped = false;
        first.cardEl.classList.remove('flipped');
        second.cardEl.classList.remove('flipped');
        this.flippedCards = [];
        this.isLocked = false;
      }, 900);
    }
  }

  useHint() {
    if (this.isLocked || this.hintsUsed >= 3) return;
    this.hintsUsed += 1;

    // Temporarily flash unmatched cards
    const unmatchedElements = this.container.querySelectorAll('.flip-card:not(.flipped)');
    unmatchedElements.forEach(el => el.classList.add('flipped'));

    setTimeout(() => {
      unmatchedElements.forEach(el => {
        const id = parseInt(el.dataset.cardId);
        const card = this.cards.find(c => c.uniqueId === id);
        if (card && !card.isMatched) {
          el.classList.remove('flipped');
          card.isFlipped = false;
        }
      });
    }, 1200);
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

  async handleGameComplete() {
    clearInterval(this.timerInterval);
    const durationMs = Date.now() - this.startTime;
    const avgReactionTime = Math.max(800, Math.round(durationMs / Math.max(1, this.totalMoves)));
    const accuracy = Math.min(1.0, Math.max(0.4, Number((this.totalPairs / Math.max(this.totalPairs, this.totalMoves)).toFixed(2))));

    // On-device DDA calculation
    const ddaResult = onDeviceDDA.calculateDDA("memory", accuracy, avgReactionTime, this.hintsUsed, "completed");

    // Save session to Local IndexedDB with synced: 0
    const sessionData = await localDB.saveGameSession({
      game_type: "memory",
      difficulty_level: this.level,
      accuracy: accuracy,
      avg_reaction_time_ms: avgReactionTime,
      hints_used: this.hintsUsed,
      rounds_completed: 1,
      completion_status: "completed",
      started_at: new Date(this.startTime).toISOString(),
      ended_at: new Date().toISOString()
    });

    voiceService.speak("game_complete");
    this.showCompletionModal(accuracy, avgReactionTime, ddaResult);

    // Trigger opportunistic background sync
    syncManager.attemptSync();
  }

  async handleTimeout() {
    const durationMs = Date.now() - this.startTime;
    const accuracy = Number((this.matchedPairs / this.totalPairs).toFixed(2));
    const ddaResult = onDeviceDDA.calculateDDA("memory", accuracy, 3500, this.hintsUsed, "timeout");

    await localDB.saveGameSession({
      game_type: "memory",
      difficulty_level: this.level,
      accuracy: accuracy,
      avg_reaction_time_ms: 3500,
      hints_used: this.hintsUsed,
      rounds_completed: 1,
      completion_status: "timeout",
      started_at: new Date(this.startTime).toISOString(),
      ended_at: new Date().toISOString()
    });

    this.showCompletionModal(accuracy, 3500, ddaResult, true);
    syncManager.attemptSync();
  }

  showCompletionModal(accuracy, avgRT, ddaResult, isTimeout = false) {
    const modal = document.createElement("div");
    modal.className = "fixed inset-0 z-50 flex items-center justify-center bg-surface/95 backdrop-blur-md px-margin-page";
    modal.innerHTML = `
      <div class="w-full max-w-xl bg-surface-container-high rounded-3xl border-4 border-primary p-8 flex flex-col items-center text-center gap-6 shadow-2xl">
        <span class="text-7xl">${isTimeout ? '⏰' : '🎉'}</span>
        <h2 class="font-headline-lg text-headline-lg text-on-surface font-bold">
          ${isTimeout ? 'Time Expired' : voiceService.getTranslation('game_complete')}
        </h2>
        <div class="grid grid-cols-2 gap-4 w-full bg-surface-container p-4 rounded-xl border-2 border-outline">
          <div>
            <p class="text-on-surface-variant font-bold">Accuracy</p>
            <p class="font-headline-lg text-primary font-bold">${Math.round(accuracy * 100)}%</p>
          </div>
          <div>
            <p class="text-on-surface-variant font-bold">Avg Reaction</p>
            <p class="font-headline-lg text-tertiary font-bold">${avgRT} ms</p>
          </div>
        </div>
        <p class="font-body-md text-on-surface-variant">${ddaResult.message}</p>
        
        <div class="flex flex-col gap-3 w-full">
          <button id="btn-next-level" class="h-touch-target-primary w-full bg-[#059669] hover:bg-[#047857] text-white rounded-xl border-4 border-[#047857] flex items-center justify-center gap-4 font-body-xl font-bold active:scale-95">
            <span class="material-symbols-outlined text-4xl">play_arrow</span>
            <span>Play Next Round (Level ${ddaResult.currentLevel})</span>
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

  exitGame() {
    clearInterval(this.timerInterval);
    if (this.onComplete) this.onComplete();
  }
}
