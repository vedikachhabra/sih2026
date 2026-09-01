// Mini-Game 3: Daily Sequencing (ধাৰাবাহিকতা খেল)
class SequencingGame {
  constructor(containerId, onComplete) {
    this.container = document.getElementById(containerId);
    this.onComplete = onComplete;
    this.startTime = null;
    this.hintsUsed = 0;
    this.timerInterval = null;
    this.timeLimitSec = 60;
    this.timeRemaining = 60;
    this.userSequence = [];

    // Familiar Daily Routine Sequence Banks
    this.routines = [
      {
        id: "tea_making",
        title: "Brewing Morning Assam Tea (ৰাতিপুৱাৰ চাহ বনোৱা)",
        steps: [
          { order: 1, text: "1. Boil Fresh Water in Kettle (কেতলীত পানী গৰম কৰক)", icon: "kettle", emoji: "🫖" },
          { order: 2, text: "2. Add Assam Tea Leaves (চাহ পাত দিয়ক)", icon: "eco", emoji: "🍃" },
          { order: 3, text: "3. Add Warm Milk & Sugar (গাখীৰ আৰু চেনি দিয়ক)", icon: "water_full", emoji: "🥛" },
          { order: 4, text: "4. Strain Tea into Ceramic Cup (কাপত চাহ চাকি লওক)", icon: "local_cafe", emoji: "☕" }
        ],
        distractor: { order: 99, text: "Put Ice Cubes in Tea (বৰফ দিয়ক)", icon: "ac_unit", emoji: "🧊" }
      },
      {
        id: "morning_meds",
        title: "Taking Morning Medication (ৰাতিপুৱাৰ ঔষধ খোৱা)",
        steps: [
          { order: 1, text: "1. Pour a Fresh Glass of Water (পানী এগিলাচ লওক)", icon: "glass_cup", emoji: "🥛" },
          { order: 2, text: "2. Open Pill Box for 8:00 AM (ঔষধৰ বাকচ খোলক)", icon: "pill", emoji: "💊" },
          { order: 3, text: "3. Place Tablet on Tongue (জিভাত টেবলেটটো থওক)", icon: "face", emoji: "👅" },
          { order: 4, text: "4. Drink Water and Swallow (পানী খাই গিলি দিয়ক)", icon: "check_circle", emoji: "✅" }
        ],
        distractor: { order: 99, text: "Take Medicine with Hot Mustard Oil", icon: "warning", emoji: "⚠️" }
      },
      {
        id: "traditional_attire",
        title: "Wearing Traditional Attire (পৰম্পৰাগত কাপোৰ পিন্ধা)",
        steps: [
          { order: 1, text: "1. Unfold Crisp Traditional Shawl (শালৰ কাপোৰখন মেলক)", icon: "checkroom", emoji: "🧣" },
          { order: 2, text: "2. Drape Across Left Shoulder (বাওঁ কান্ধত পেলাই লওক)", icon: "accessibility", emoji: "🦺" },
          { order: 3, text: "3. Adjust Pleats Neatly (ভাজবোৰ মিলাই লওক)", icon: "style", emoji: "✨" }
        ],
        distractor: { order: 99, text: "Wear Raincoat Indoors", icon: "umbrella", emoji: "☂️" }
      }
    ];
  }

  start(level = 2) {
    this.level = level;
    const specs = onDeviceDDA.getLevelSpecs("sequencing", level);
    this.timeLimitSec = specs.timeLimitSec;
    this.timeRemaining = this.timeLimitSec;
    this.hintsUsed = 0;
    this.userSequence = [];
    this.startTime = Date.now();

    // Select routine based on level
    this.activeRoutine = this.routines[(level - 1) % this.routines.length];
    
    // Pool steps
    let stepsPool = [...this.activeRoutine.steps];
    if (level >= 3 && this.activeRoutine.distractor) {
      stepsPool.push(this.activeRoutine.distractor);
    }
    
    // Shuffle options
    this.shuffledSteps = stepsPool.sort(() => Math.random() - 0.5);

    voiceService.speak("sequencing_intro");
    this.render();
    this.startTimer();
  }

  render() {
    this.container.innerHTML = `
      <div class="flex flex-col gap-stack-gap">
        <!-- Game Header -->
        <section class="flex flex-col gap-4 bg-surface-container p-6 rounded-xl border-4 border-outline-variant">
          <div class="flex justify-between items-center w-full">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-primary text-4xl">format_list_numbered</span>
              <span class="font-body-xl text-body-xl text-on-surface font-bold">${voiceService.getTranslation("level")} ${this.level}</span>
            </div>
            <div class="bg-surface-container-high px-6 py-2 rounded-full border-2 border-outline">
              <span class="font-body-lg text-body-lg text-on-surface-variant font-bold">
                ${this.activeRoutine.title}
              </span>
            </div>
          </div>

          <!-- Countdown Progress Bar -->
          <div class="w-full bg-surface-container-highest h-4 rounded-full overflow-hidden border border-outline">
            <div id="seq-timer-bar" class="bg-tertiary h-full rounded-full transition-all duration-1000" style="width: 100%;"></div>
          </div>
        </section>

        <!-- Selected Sequence Slot Target Area -->
        <section class="bg-surface-container-low p-6 rounded-xl border-4 border-dashed border-primary flex flex-col gap-3 min-h-[160px]">
          <h3 class="font-headline-lg text-headline-lg text-primary text-center font-bold">
            Your Sequence (${this.userSequence.length}/${this.activeRoutine.steps.length})
          </h3>
          <div id="seq-slot-container" class="flex flex-col gap-3">
            ${this.userSequence.map((step, idx) => `
              <div class="flex items-center justify-between bg-primary-container p-4 rounded-xl border-2 border-primary animate-fade-in">
                <div class="flex items-center gap-4">
                  <span class="text-4xl">${step.emoji}</span>
                  <span class="font-body-xl text-on-primary-container font-bold">${idx + 1}. ${step.text}</span>
                </div>
                <button data-remove-idx="${idx}" class="btn-remove-step px-4 py-2 bg-error text-on-error rounded-lg font-bold">Undo</button>
              </div>
            `).join('')}
            ${this.userSequence.length === 0 ? `
              <p class="text-center text-on-surface-variant text-xl py-6">Tap the cards below in the correct order!</p>
            ` : ''}
          </div>
        </section>

        <!-- Available Step Options -->
        <section class="flex flex-col gap-3">
          <h4 class="font-body-xl text-body-xl font-bold text-on-surface">Available Steps (Tap to Place):</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${this.shuffledSteps.map((step) => {
              const isAlreadySelected = this.userSequence.some(s => s.text === step.text);
              return `
                <button data-step-text="${step.text}" ${isAlreadySelected ? 'disabled' : ''} class="step-option-card ${isAlreadySelected ? 'opacity-30 pointer-events-none' : ''} bg-surface-container-high hover:bg-secondary-container active:scale-95 transition-transform p-5 rounded-xl border-4 border-outline flex items-center gap-4 text-left cursor-pointer">
                  <span class="text-5xl">${step.emoji}</span>
                  <span class="font-body-xl text-on-surface font-bold">${step.text}</span>
                </button>
              `;
            }).join('')}
          </div>
        </section>

        <!-- Bottom Controls -->
        <section class="flex flex-col gap-4 mt-auto pt-2">
          <button id="btn-seq-check" class="h-touch-target-primary w-full bg-[#059669] hover:bg-[#047857] text-white rounded-xl border-4 border-[#047857] flex items-center justify-center gap-4 active:scale-95 ${this.userSequence.length === this.activeRoutine.steps.length ? '' : 'opacity-60'}">
            <span class="material-symbols-outlined text-4xl">check_circle</span>
            <span class="font-body-xl text-body-xl font-bold">Verify Sequence</span>
          </button>
          <button id="btn-seq-exit" class="h-touch-target-min w-full bg-error-container hover:bg-error text-on-error-container hover:text-on-error rounded-xl border-4 border-on-error flex items-center justify-center gap-4 active:scale-95">
            <span class="material-symbols-outlined text-[28px]">exit_to_app</span>
            <span class="font-body-lg text-body-lg font-bold">${voiceService.getTranslation("exit_game")}</span>
          </button>
        </section>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const stepBtns = this.container.querySelectorAll('.step-option-card:not([disabled])');
    stepBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const stepText = btn.dataset.stepText;
        const stepObj = this.shuffledSteps.find(s => s.text === stepText);
        if (stepObj) {
          this.userSequence.push(stepObj);
          if (navigator.vibrate) navigator.vibrate(50);
          this.render();
        }
      });
    });

    const removeBtns = this.container.querySelectorAll('.btn-remove-step');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.removeIdx);
        this.userSequence.splice(idx, 1);
        this.render();
      });
    });

    document.getElementById('btn-seq-check')?.addEventListener('click', () => this.verifySequence());
    document.getElementById('btn-seq-exit')?.addEventListener('click', () => this.exitGame());
  }

  verifySequence() {
    if (this.userSequence.length !== this.activeRoutine.steps.length) return;

    let correctCount = 0;
    for (let i = 0; i < this.activeRoutine.steps.length; i++) {
      if (this.userSequence[i]?.order === (i + 1)) {
        correctCount += 1;
      }
    }

    const accuracy = Number((correctCount / this.activeRoutine.steps.length).toFixed(2));
    const durationMs = Date.now() - this.startTime;
    const avgRT = Math.round(durationMs / Math.max(1, this.activeRoutine.steps.length));

    if (accuracy >= 0.75) {
      this.handleGameComplete(accuracy, avgRT);
    } else {
      voiceService.speak("Let's try that sequence again.");
      alert("Some steps are out of order. Review and try again!");
    }
  }

  startTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timeRemaining -= 1;
      const bar = document.getElementById("seq-timer-bar");
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

  async handleGameComplete(accuracy, avgRT) {
    clearInterval(this.timerInterval);
    const ddaResult = onDeviceDDA.calculateDDA("sequencing", accuracy, avgRT, this.hintsUsed, "completed");

    await localDB.saveGameSession({
      game_type: "sequencing",
      difficulty_level: this.level,
      accuracy: accuracy,
      avg_reaction_time_ms: avgRT,
      hints_used: this.hintsUsed,
      rounds_completed: 1,
      completion_status: "completed",
      started_at: new Date(this.startTime).toISOString(),
      ended_at: new Date().toISOString()
    });

    voiceService.speak("game_complete");
    this.showCompletionModal(accuracy, avgRT, ddaResult);
    syncManager.attemptSync();
  }

  async handleTimeout() {
    const accuracy = 0.50;
    const ddaResult = onDeviceDDA.calculateDDA("sequencing", accuracy, 3500, this.hintsUsed, "timeout");

    await localDB.saveGameSession({
      game_type: "sequencing",
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
        <span class="text-7xl">${isTimeout ? '⏰' : '🍵'}</span>
        <h2 class="font-headline-lg text-headline-lg text-on-surface font-bold">
          ${isTimeout ? 'Time Expired' : voiceService.getTranslation('game_complete')}
        </h2>
        <div class="grid grid-cols-2 gap-4 w-full bg-surface-container p-4 rounded-xl border-2 border-outline">
          <div>
            <p class="text-on-surface-variant font-bold">Accuracy</p>
            <p class="font-headline-lg text-primary font-bold">${Math.round(accuracy * 100)}%</p>
          </div>
          <div>
            <p class="text-on-surface-variant font-bold">Executive Speed</p>
            <p class="font-headline-lg text-tertiary font-bold">${avgRT} ms</p>
          </div>
        </div>
        <p class="font-body-md text-on-surface-variant">${ddaResult.message}</p>
        
        <div class="flex flex-col gap-3 w-full">
          <button id="btn-next-level-seq" class="h-touch-target-primary w-full bg-[#059669] hover:bg-[#047857] text-white rounded-xl border-4 border-[#047857] flex items-center justify-center gap-4 font-body-xl font-bold active:scale-95">
            <span class="material-symbols-outlined text-4xl">play_arrow</span>
            <span>Play Next Round (Level ${ddaResult.currentLevel})</span>
          </button>
          <button id="btn-return-home-seq" class="h-touch-target-min w-full bg-surface-container hover:bg-secondary-container text-on-surface rounded-xl border-2 border-outline flex items-center justify-center gap-4 font-body-lg font-bold active:scale-95">
            <span class="material-symbols-outlined text-2xl">home</span>
            <span>${voiceService.getTranslation('home')}</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-next-level-seq').addEventListener('click', () => {
      modal.remove();
      this.start(ddaResult.currentLevel);
    });

    modal.querySelector('#btn-return-home-seq').addEventListener('click', () => {
      modal.remove();
      this.exitGame();
    });
  }

  exitGame() {
    clearInterval(this.timerInterval);
    if (this.onComplete) this.onComplete();
  }
}
