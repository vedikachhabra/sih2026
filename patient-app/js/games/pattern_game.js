// Mini-Game 4: Pattern & Shape Recognition (আকৃতি চিনাক্তকৰণ)
class PatternGame {
  constructor(containerId, onComplete) {
    this.container = document.getElementById(containerId);
    this.onComplete = onComplete;
    this.round = 1;
    this.totalRounds = 3;
    this.correctPicks = 0;
    this.hintsUsed = 0;
    this.timerInterval = null;
    this.timeLimitSec = 45;
    this.timeRemaining = 45;
    this.reactionTimes = [];

    // Traditional Pattern Puzzles (Assam/Mizo/Naga handloom geometry)
    this.puzzles = [
      {
        question: "Complete the Diamond Weave Pattern (হীৰা আকৃতিৰ নক্সা)",
        sequence: ["💎", "💠", "💎", "💠", "❓"],
        options: ["💎", "🔶", "🔺", "🟢"],
        correctIndex: 0
      },
      {
        question: "Identify the Matching Rotated Motif (ঘূৰোৱা নক্সা)",
        sequence: ["🔷", "🔶", "🔷", "🔶", "❓"],
        options: ["🔶", "🔷", "⭐", "🟣"],
        correctIndex: 1
      },
      {
        question: "Complete the Cultural Color Sequence (ৰঙৰ ক্ৰম)",
        sequence: ["🔴", "🟡", "🟢", "🔴", "🟡", "❓"],
        options: ["🟢", "🔵", "🟣", "⚪"],
        correctIndex: 0
      }
    ];
  }

  start(level = 2) {
    this.level = level;
    const specs = onDeviceDDA.getLevelSpecs("pattern", level);
    this.timeLimitSec = specs.timeLimitSec;
    this.timeRemaining = this.timeLimitSec;
    this.round = 1;
    this.correctPicks = 0;
    this.hintsUsed = 0;
    this.reactionTimes = [];
    this.startTime = Date.now();

    voiceService.speak("pattern_intro");
    this.renderRound();
    this.startTimer();
  }

  renderRound() {
    const puzzle = this.puzzles[(this.round - 1 + this.level) % this.puzzles.length];
    this.roundStartTime = Date.now();

    this.container.innerHTML = `
      <div class="flex flex-col gap-stack-gap">
        <!-- Game Header -->
        <section class="flex flex-col gap-4 bg-surface-container p-6 rounded-xl border-4 border-outline-variant">
          <div class="flex justify-between items-center w-full">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-primary text-4xl">extension</span>
              <span class="font-body-xl text-body-xl text-on-surface font-bold">${voiceService.getTranslation("level")} ${this.level}</span>
            </div>
            <div class="bg-surface-container-high px-6 py-2 rounded-full border-2 border-outline">
              <span class="font-body-lg text-body-lg text-on-surface-variant font-bold">
                Round ${this.round}/${this.totalRounds}
              </span>
            </div>
          </div>

          <!-- Countdown Progress Bar -->
          <div class="w-full bg-surface-container-highest h-4 rounded-full overflow-hidden border border-outline">
            <div id="pattern-timer-bar" class="bg-tertiary h-full rounded-full transition-all duration-1000" style="width: 100%;"></div>
          </div>

          <button id="btn-pattern-hint" class="h-touch-target-primary w-full bg-secondary-container hover:bg-secondary-fixed text-on-surface rounded-xl border-4 border-outline flex items-center justify-center gap-4 active:scale-95">
            <span class="material-symbols-outlined text-[40px]">lightbulb</span>
            <span class="font-headline-lg text-headline-lg font-bold">${voiceService.getTranslation("hint")}</span>
          </button>
        </section>

        <!-- Pattern Puzzle Board -->
        <section class="bg-surface-container-low p-6 rounded-xl border-4 border-outline-variant flex flex-col items-center gap-6">
          <h3 class="font-headline-lg text-headline-lg text-on-surface text-center font-bold">${puzzle.question}</h3>
          
          <!-- Sequence Row -->
          <div class="flex flex-wrap justify-center items-center gap-4 py-4 bg-surface-container p-6 rounded-2xl border-2 border-outline w-full">
            ${puzzle.sequence.map(item => `
              <div class="w-20 h-20 md:w-24 md:h-24 bg-surface-container-high rounded-2xl border-4 border-primary flex items-center justify-center text-4xl md:text-5xl shadow-md ${item === '❓' ? 'animate-pulse bg-tertiary-container text-tertiary border-tertiary' : ''}">
                <span>${item}</span>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Option Selection Cards -->
        <section class="flex flex-col gap-3">
          <h4 class="font-body-xl text-body-xl font-bold text-on-surface text-center">Which symbol comes next?</h4>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            ${puzzle.options.map((opt, idx) => `
              <button data-opt-idx="${idx}" class="pattern-option-btn bg-surface-container-high hover:bg-secondary-container active:scale-90 transition-transform h-[110px] md:h-[130px] rounded-2xl border-4 border-outline flex flex-col items-center justify-center text-5xl focus:outline-none focus:ring-4 focus:ring-primary cursor-pointer">
                <span>${opt}</span>
              </button>
            `).join('')}
          </div>
        </section>

        <!-- Bottom Controls -->
        <section class="flex flex-col gap-4 mt-auto pt-2">
          <button id="btn-pattern-hear" class="h-touch-target-primary w-full bg-primary hover:bg-primary-fixed text-on-primary rounded-xl border-4 border-on-primary-fixed flex items-center justify-center gap-4 active:scale-95">
            <span class="material-symbols-outlined text-[32px]">volume_up</span>
            <span class="font-body-xl text-body-xl font-bold">${voiceService.getTranslation("hear_instruction")}</span>
          </button>
          <button id="btn-pattern-exit" class="h-touch-target-min w-full bg-error-container hover:bg-error text-on-error-container hover:text-on-error rounded-xl border-4 border-on-error flex items-center justify-center gap-4 active:scale-95">
            <span class="material-symbols-outlined text-[28px]">exit_to_app</span>
            <span class="font-body-lg text-body-lg font-bold">${voiceService.getTranslation("exit_game")}</span>
          </button>
        </section>
      </div>
    `;

    this.attachEvents(puzzle);
  }

  attachEvents(puzzle) {
    const btns = this.container.querySelectorAll('.pattern-option-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.optIdx);
        this.handlePick(idx === puzzle.correctIndex, btn);
      });
    });

    document.getElementById('btn-pattern-hint')?.addEventListener('click', () => this.useHint(puzzle.correctIndex));
    document.getElementById('btn-pattern-hear')?.addEventListener('click', () => voiceService.speak("pattern_intro"));
    document.getElementById('btn-pattern-exit')?.addEventListener('click', () => this.exitGame());
  }

  handlePick(isCorrect, btnEl) {
    const rt = Date.now() - this.roundStartTime;
    this.reactionTimes.push(rt);

    if (isCorrect) {
      this.correctPicks += 1;
      btnEl.style.backgroundColor = "#059669";
      btnEl.style.borderColor = "#047857";
      if (navigator.vibrate) navigator.vibrate(80);

      setTimeout(() => {
        if (this.round < this.totalRounds) {
          this.round += 1;
          this.renderRound();
        } else {
          this.handleGameComplete();
        }
      }, 600);
    } else {
      btnEl.style.borderColor = "#ef4444";
      btnEl.classList.add("shake-animation");
      setTimeout(() => {
        btnEl.style.borderColor = "";
      }, 600);
    }
  }

  useHint(correctIndex) {
    if (this.hintsUsed >= 3) return;
    this.hintsUsed += 1;
    const correctBtn = this.container.querySelector(`.pattern-option-btn[data-opt-idx="${correctIndex}"]`);
    if (correctBtn) {
      correctBtn.classList.add("ring-4", "ring-tertiary", "scale-110");
      setTimeout(() => correctBtn.classList.remove("ring-4", "ring-tertiary", "scale-110"), 1000);
    }
  }

  startTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timeRemaining -= 1;
      const bar = document.getElementById("pattern-timer-bar");
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
    const avgRT = Math.round(this.reactionTimes.reduce((a, b) => a + b, 0) / Math.max(1, this.reactionTimes.length));
    const accuracy = Number((this.correctPicks / this.totalRounds).toFixed(2));

    const ddaResult = onDeviceDDA.calculateDDA("pattern", accuracy, avgRT, this.hintsUsed, "completed");

    await localDB.saveGameSession({
      game_type: "pattern",
      difficulty_level: this.level,
      accuracy: accuracy,
      avg_reaction_time_ms: avgRT,
      hints_used: this.hintsUsed,
      rounds_completed: this.totalRounds,
      completion_status: "completed",
      started_at: new Date(this.startTime).toISOString(),
      ended_at: new Date().toISOString()
    });

    voiceService.speak("game_complete");
    this.showCompletionModal(accuracy, avgRT, ddaResult);
    syncManager.attemptSync();
  }

  async handleTimeout() {
    const accuracy = Number((this.correctPicks / this.totalRounds).toFixed(2));
    const ddaResult = onDeviceDDA.calculateDDA("pattern", accuracy, 3500, this.hintsUsed, "timeout");

    await localDB.saveGameSession({
      game_type: "pattern",
      difficulty_level: this.level,
      accuracy: accuracy,
      avg_reaction_time_ms: 3500,
      hints_used: this.hintsUsed,
      rounds_completed: this.round,
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
        <span class="text-7xl">${isTimeout ? '⏰' : '🧩'}</span>
        <h2 class="font-headline-lg text-headline-lg text-on-surface font-bold">
          ${isTimeout ? 'Time Expired' : voiceService.getTranslation('game_complete')}
        </h2>
        <div class="grid grid-cols-2 gap-4 w-full bg-surface-container p-4 rounded-xl border-2 border-outline">
          <div>
            <p class="text-on-surface-variant font-bold">Accuracy</p>
            <p class="font-headline-lg text-primary font-bold">${Math.round(accuracy * 100)}%</p>
          </div>
          <div>
            <p class="text-on-surface-variant font-bold">Pattern Speed</p>
            <p class="font-headline-lg text-tertiary font-bold">${avgRT} ms</p>
          </div>
        </div>
        <p class="font-body-md text-on-surface-variant">${ddaResult.message}</p>
        
        <div class="flex flex-col gap-3 w-full">
          <button id="btn-next-level-pat" class="h-touch-target-primary w-full bg-[#059669] hover:bg-[#047857] text-white rounded-xl border-4 border-[#047857] flex items-center justify-center gap-4 font-body-xl font-bold active:scale-95">
            <span class="material-symbols-outlined text-4xl">play_arrow</span>
            <span>Play Next Round (Level ${ddaResult.currentLevel})</span>
          </button>
          <button id="btn-return-home-pat" class="h-touch-target-min w-full bg-surface-container hover:bg-secondary-container text-on-surface rounded-xl border-2 border-outline flex items-center justify-center gap-4 font-body-lg font-bold active:scale-95">
            <span class="material-symbols-outlined text-2xl">home</span>
            <span>${voiceService.getTranslation('home')}</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-next-level-pat').addEventListener('click', () => {
      modal.remove();
      this.start(ddaResult.currentLevel);
    });

    modal.querySelector('#btn-return-home-pat').addEventListener('click', () => {
      modal.remove();
      this.exitGame();
    });
  }

  exitGame() {
    clearInterval(this.timerInterval);
    if (this.onComplete) this.onComplete();
  }
}
