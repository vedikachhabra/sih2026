// Main Patient App Coordinator
class PatientApp {
  constructor() {
    this.currentView = "home";
    this.activeGameInstance = null;
    this.fontSizeScale = 1.0;
    this.currentPatient = {
      id: "p-assam-001",
      name: "Priyom Barua",
      age: 72,
      gender: "Male",
      region: "Assam (Guwahati)",
      preferred_language: "as",
      dementia_stage: "MCI",
      caregiver_name: "Anjali Barua",
      caregiver_relation: "Daughter",
      caregiver_phone: "+91 98640-12345"
    };
    this.activeMedication = {
      title: "Donepezil (5mg)",
      dosage: "1 Tablet with Fresh Water",
      time_of_day: "08:00"
    };
    this.init();
  }

  async init() {
    // 1. Load Profile from IndexedDB or LocalStorage
    const profile = await localDB.getPatientProfile();
    if (profile && profile.name) {
      this.currentPatient = { ...this.currentPatient, ...profile };
      voiceService.setLanguage(profile.preferred_language || "as");
      syncManager.patientId = profile.id || "p-assam-001";
    }

    // 2. Set Theme & Font
    this.applyTheme(localStorage.getItem("patient_theme") || "dark");
    this.applyFontSize(parseFloat(localStorage.getItem("patient_font_scale") || "1.0"));

    // 3. Update Top Bar and Render Home UI
    this.updateTopBar();
    this.renderHome();

    // 4. Attach Navigation & Global Listeners
    this.attachGlobalEvents();

    // 5. Initial Spoken Greeting
    setTimeout(() => {
      const lang = voiceService.currentLanguage;
      const langData = TRANSLATIONS[lang] || TRANSLATIONS.as;
      voiceService.speak(langData.spoken_prompts?.welcome || `Welcome ${this.currentPatient.name}`);
    }, 800);
  }

  updateTopBar() {
    const lang = voiceService.currentLanguage;
    const langData = TRANSLATIONS[lang] || TRANSLATIONS.as;

    // Update TopBar Patient Name & Avatar
    const nameEl = document.getElementById("top-patient-name");
    const avatarEl = document.getElementById("top-patient-avatar");
    if (nameEl) nameEl.innerText = this.currentPatient.name || "Patient";
    if (avatarEl) {
      const initials = (this.currentPatient.name || "PT")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
      avatarEl.innerHTML = `<span>${initials}</span>`;
    }

    // Update Language Button Label
    const langTextEl = document.getElementById("top-lang-text");
    if (langTextEl) langTextEl.innerText = langData.lang_name.split(" ")[0];

    // Update Register Button Label
    const regTextEl = document.getElementById("top-register-text");
    if (regTextEl) regTextEl.innerText = langData.register_patient || "Patient Profile";
  }

  applyTheme(theme) {
    document.documentElement.className = theme;
    localStorage.setItem("patient_theme", theme);
  }

  applyFontSize(scale) {
    this.fontSizeScale = scale;
    document.documentElement.style.fontSize = `${scale * 100}%`;
    localStorage.setItem("patient_font_scale", scale);
  }

  renderHome() {
    this.currentView = "home";
    const mainCanvas = document.getElementById("main-canvas");
    const lang = voiceService.currentLanguage;
    const langData = TRANSLATIONS[lang] || TRANSLATIONS.as;

    const cgName = this.currentPatient.caregiver_name || "Caregiver";
    const cgRel = this.currentPatient.caregiver_relation ? ` (${this.currentPatient.caregiver_relation})` : "";

    mainCanvas.innerHTML = `
      <!-- Daily Cognitive Streak & Progress Banner -->
      <section class="bg-gradient-to-r from-purple-950/80 via-slate-900 to-teal-950/80 rounded-2xl border-4 border-primary p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="flex items-center gap-5">
          <div class="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center text-4xl shadow-inner">
            🔥
          </div>
          <div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold px-3 py-1 rounded-full uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Active Streak: 4 Days
              </span>
              <span class="text-xs font-bold text-teal-300">Stage: ${this.currentPatient.dementia_stage || 'MCI'}</span>
            </div>
            <h2 class="text-2xl font-bold text-white mt-1">${langData.greeting ? langData.greeting.replace("Priyom", this.currentPatient.name.split(" ")[0]) : `Welcome, ${this.currentPatient.name}!`}</h2>
            <p class="text-xs text-slate-300 mt-0.5">${this.currentPatient.name} • ${this.currentPatient.region}</p>
          </div>
        </div>

        <!-- 1-Tap Emergency Caregiver Connect -->
        <button id="btn-call-caregiver" class="w-full md:w-auto px-6 py-3.5 bg-rose-900/60 hover:bg-rose-800 border-2 border-rose-500 text-rose-200 rounded-xl font-bold text-sm flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-lg cursor-pointer">
          <span class="material-symbols-outlined text-2xl text-rose-400">call</span>
          <span>Call ${cgName}${cgRel}</span>
        </button>
      </section>

      <!-- Daily Care Alert Card (Medication) -->
      <section class="bg-surface-container-high rounded-xl border-4 border-primary p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
        <div class="flex items-center gap-6 cursor-pointer" id="card-open-med-modal">
          <span class="material-symbols-outlined text-6xl text-primary" style="font-variation-settings: 'FILL' 1;">medication</span>
          <div>
            <h2 class="font-headline-lg text-headline-lg text-on-surface font-bold">${this.activeMedication.title || langData.morning_pill}</h2>
            <p class="font-body-xl text-body-xl text-on-surface-variant">${this.activeMedication.dosage || langData.morning_pill_desc}</p>
          </div>
        </div>
        <button id="btn-home-mark-med" class="w-full md:w-auto h-touch-target-primary px-8 rounded-xl bg-[#059669] text-white font-body-xl text-body-xl font-bold flex items-center justify-center gap-4 hover:bg-[#047857] active:scale-95 transition-transform border-4 border-[#047857] cursor-pointer shadow-lg">
          <span class="material-symbols-outlined text-4xl" style="font-variation-settings: 'FILL' 1;">check_circle</span>
          <span>${langData.marked_taken}</span>
        </button>
      </section>

      <!-- 4 Cognitive Mini-Games Grid -->
      <section>
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-headline-lg text-headline-lg font-bold text-on-surface">${langData.daily_exercises}</h2>
          <span class="text-xs text-primary font-bold bg-primary-container px-3 py-1 rounded-full border border-primary-fixed">
            Continuous Flow State DDA Active
          </span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-stack-gap">
          <!-- Game 1: Memory Pairs -->
          <button data-game="memory" class="btn-launch-game bg-surface-container rounded-xl border-4 border-outline-variant p-6 min-h-[140px] flex items-center gap-6 hover:bg-secondary-container active:scale-95 transition-transform text-left cursor-pointer group focus:ring-4 focus:ring-primary shadow-md">
            <span class="text-6xl group-hover:scale-110 transition-transform">🎴</span>
            <div>
              <h3 class="font-body-xl text-body-xl font-bold text-on-surface">${langData.memory_game}</h3>
              <p class="font-body-md text-body-md text-on-surface-variant">${langData.memory_desc}</p>
            </div>
          </button>

          <!-- Game 2: Attention -->
          <button data-game="attention" class="btn-launch-game bg-surface-container rounded-xl border-4 border-outline-variant p-6 min-h-[140px] flex items-center gap-6 hover:bg-secondary-container active:scale-95 transition-transform text-left cursor-pointer group focus:ring-4 focus:ring-primary shadow-md">
            <span class="text-6xl group-hover:scale-110 transition-transform">🔍</span>
            <div>
              <h3 class="font-body-xl text-body-xl font-bold text-on-surface">${langData.attention_game}</h3>
              <p class="font-body-md text-body-md text-on-surface-variant">${langData.attention_desc}</p>
            </div>
          </button>

          <!-- Game 3: Sequencing -->
          <button data-game="sequencing" class="btn-launch-game bg-surface-container rounded-xl border-4 border-outline-variant p-6 min-h-[140px] flex items-center gap-6 hover:bg-secondary-container active:scale-95 transition-transform text-left cursor-pointer group focus:ring-4 focus:ring-primary shadow-md">
            <span class="text-6xl group-hover:scale-110 transition-transform">🔢</span>
            <div>
              <h3 class="font-body-xl text-body-xl font-bold text-on-surface">${langData.sequencing_game}</h3>
              <p class="font-body-md text-body-md text-on-surface-variant">${langData.sequencing_desc}</p>
            </div>
          </button>

          <!-- Game 4: Pattern Match -->
          <button data-game="pattern" class="btn-launch-game bg-surface-container rounded-xl border-4 border-outline-variant p-6 min-h-[140px] flex items-center gap-6 hover:bg-secondary-container active:scale-95 transition-transform text-left cursor-pointer group focus:ring-4 focus:ring-primary shadow-md">
            <span class="text-6xl group-hover:scale-110 transition-transform">🧩</span>
            <div>
              <h3 class="font-body-xl text-body-xl font-bold text-on-surface">${langData.pattern_game}</h3>
              <p class="font-body-md text-body-md text-on-surface-variant">${langData.pattern_desc}</p>
            </div>
          </button>
        </div>
      </section>

      <!-- Family Memory Anchor & Reminiscence Gallery (Dementia Care) -->
      <section class="bg-surface-container rounded-xl border-4 border-outline-variant p-6 space-y-4 shadow-lg">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-amber-400 text-3xl">photo_album</span>
            <h3 class="font-headline-lg text-headline-lg font-bold text-on-surface">${langData.memory_album_title || "Memory Album"}</h3>
          </div>
          <span class="text-xs text-slate-400">${langData.memory_album_subtitle || "Tap any photo to hear voice memories"}</span>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button data-memory-voice="${langData.memory_ananya}" class="btn-memory-card bg-surface-container-high hover:bg-secondary-container p-4 rounded-xl border-2 border-outline flex flex-col items-center gap-2 active:scale-95 transition-transform text-center cursor-pointer">
            <span class="text-5xl">👧</span>
            <p class="font-bold text-sm text-on-surface">${langData.ananya_label || "Family Photo"}</p>
            <span class="text-xs text-primary font-medium">Guwahati</span>
          </button>

          <button data-memory-voice="${langData.memory_river}" class="btn-memory-card bg-surface-container-high hover:bg-secondary-container p-4 rounded-xl border-2 border-outline flex flex-col items-center gap-2 active:scale-95 transition-transform text-center cursor-pointer">
            <span class="text-5xl">🌅</span>
            <p class="font-bold text-sm text-on-surface">${langData.river_label || "Brahmaputra River"}</p>
            <span class="text-xs text-primary font-medium">Morning Walk</span>
          </button>

          <button data-memory-voice="${langData.memory_home}" class="btn-memory-card bg-surface-container-high hover:bg-secondary-container p-4 rounded-xl border-2 border-outline flex flex-col items-center gap-2 active:scale-95 transition-transform text-center cursor-pointer">
            <span class="text-5xl">🏡</span>
            <p class="font-bold text-sm text-on-surface">${langData.home_label || "Family Residence"}</p>
            <span class="text-xs text-primary font-medium">Sweet Home</span>
          </button>

          <button data-memory-voice="${langData.memory_park}" class="btn-memory-card bg-surface-container-high hover:bg-secondary-container p-4 rounded-xl border-2 border-outline flex flex-col items-center gap-2 active:scale-95 transition-transform text-center cursor-pointer">
            <span class="text-5xl">🦏</span>
            <p class="font-bold text-sm text-on-surface">${langData.park_label || "Kaziranga Park"}</p>
            <span class="text-xs text-primary font-medium">Family Trip</span>
          </button>
        </div>
      </section>

      <!-- Mood Check-in Section -->
      <section id="mood-section" class="bg-surface-container-low rounded-xl border-4 border-outline-variant p-6">
        <h2 class="font-headline-lg text-headline-lg font-bold mb-6 text-center text-on-surface">${langData.how_feeling}</h2>
        <div class="flex flex-wrap justify-center gap-4">
          <button data-mood="5" class="btn-mood-log bg-surface-container rounded-xl border-2 border-outline p-4 min-w-[130px] flex flex-col items-center gap-2 hover:bg-secondary-container active:scale-90 transition-transform cursor-pointer">
            <span class="text-5xl">😄</span>
            <span class="font-body-md text-body-md font-bold">${langData.very_happy}</span>
          </button>
          <button data-mood="4" class="btn-mood-log bg-surface-container rounded-xl border-2 border-outline p-4 min-w-[130px] flex flex-col items-center gap-2 hover:bg-secondary-container active:scale-90 transition-transform cursor-pointer">
            <span class="text-5xl">😊</span>
            <span class="font-body-md text-body-md font-bold">${langData.calm}</span>
          </button>
          <button data-mood="3" class="btn-mood-log bg-surface-container rounded-xl border-2 border-outline p-4 min-w-[130px] flex flex-col items-center gap-2 hover:bg-secondary-container active:scale-90 transition-transform cursor-pointer">
            <span class="text-5xl">😐</span>
            <span class="font-body-md text-body-md font-bold">${langData.okay}</span>
          </button>
          <button data-mood="2" class="btn-mood-log bg-surface-container rounded-xl border-2 border-outline p-4 min-w-[130px] flex flex-col items-center gap-2 hover:bg-secondary-container active:scale-90 transition-transform cursor-pointer">
            <span class="text-5xl">😕</span>
            <span class="font-body-md text-body-md font-bold">${langData.confused}</span>
          </button>
          <button data-mood="1" class="btn-mood-log bg-surface-container rounded-xl border-2 border-outline p-4 min-w-[130px] flex flex-col items-center gap-2 hover:bg-secondary-container active:scale-90 transition-transform cursor-pointer">
            <span class="text-5xl">😢</span>
            <span class="font-body-md text-body-md font-bold">${langData.sad}</span>
          </button>
        </div>
      </section>
    `;

    this.attachHomeEvents();
    syncManager.updateSyncUI();
  }

  attachHomeEvents() {
    // Launch Game Buttons
    const gameBtns = document.querySelectorAll('.btn-launch-game');
    gameBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const gameType = btn.dataset.game;
        this.launchGame(gameType);
      });
    });

    // Memory Album Voice Cards
    const memoryCards = document.querySelectorAll('.btn-memory-card');
    memoryCards.forEach(card => {
      card.addEventListener('click', () => {
        const voiceText = card.dataset.memoryVoice;
        if (voiceText) {
          voiceService.speak(voiceText);
          card.classList.add("ring-4", "ring-primary", "scale-105");
          setTimeout(() => card.classList.remove("ring-4", "ring-primary", "scale-105"), 1000);
        }
      });
    });

    // Emergency Caregiver Call Button
    document.getElementById('btn-call-caregiver')?.addEventListener('click', () => {
      this.triggerCaregiverCall();
    });

    // Open Medication Alert from Canvas Card
    document.getElementById('card-open-med-modal')?.addEventListener('click', () => {
      this.openMedicationModal();
    });

    // Mood Log Buttons
    const moodBtns = document.querySelectorAll('.btn-mood-log');
    moodBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const score = parseInt(btn.dataset.mood);
        await localDB.saveMoodLog(score);
        voiceService.speak("Thank you for sharing your mood.");
        btn.classList.add("ring-4", "ring-primary", "scale-105");
        setTimeout(() => btn.classList.remove("ring-4", "ring-primary", "scale-105"), 1000);
        syncManager.attemptSync();
      });
    });

    // Mark Medication Button
    document.getElementById('btn-home-mark-med')?.addEventListener('click', async () => {
      await this.markMedicationTaken();
    });
  }

  triggerCaregiverCall() {
    const cgName = this.currentPatient.caregiver_name || "Caregiver";
    const cgRel = this.currentPatient.caregiver_relation || "Family Caregiver";
    const cgPhone = this.currentPatient.caregiver_phone || "+91 98640-12345";
    voiceService.speak(`Connecting to ${cgName}. Alerting now.`);
    alert(`📞 EMERGENCY CALL CONNECTED\n\nCaregiver: ${cgName} (${cgRel})\nPhone: ${cgPhone}\nStatus: Caregiver alerted and on their way.`);
  }

  openMedicationModal() {
    const overlay = document.getElementById("medication-alert-overlay");
    if (overlay) {
      overlay.classList.remove("hidden");
      voiceService.speak("med_reminder");
    }
  }

  closeMedicationModal() {
    const overlay = document.getElementById("medication-alert-overlay");
    if (overlay) overlay.classList.add("hidden");
  }

  async markMedicationTaken() {
    this.closeMedicationModal();
    const btn = document.getElementById('btn-home-mark-med');
    if (btn) {
      btn.innerHTML = `<span class="material-symbols-outlined text-4xl">done_all</span><span>Completed for Today</span>`;
      btn.classList.add("bg-teal-700");
    }
    await localDB.saveTaskLog({
      task_type: "medication",
      title: this.activeMedication.title || "Morning Medication (Donepezil 5mg)",
      status: "done"
    });
    voiceService.speak("Good job! Your morning medicine is recorded.");
    syncManager.attemptSync();
  }

  launchGame(gameType) {
    this.currentView = "game";
    const mainCanvas = document.getElementById("main-canvas");
    mainCanvas.innerHTML = `<div id="active-game-container"></div>`;

    const level = onDeviceDDA.getCurrentLevel(gameType);

    if (gameType === "memory") {
      this.activeGameInstance = new MemoryGame("active-game-container", () => this.renderHome());
      this.activeGameInstance.start(level);
    } else if (gameType === "attention") {
      this.activeGameInstance = new AttentionGame("active-game-container", () => this.renderHome());
      this.activeGameInstance.start(level);
    } else if (gameType === "sequencing") {
      this.activeGameInstance = new SequencingGame("active-game-container", () => this.renderHome());
      this.activeGameInstance.start(level);
    } else if (gameType === "pattern") {
      this.activeGameInstance = new PatternGame("active-game-container", () => this.renderHome());
      this.activeGameInstance.start(level);
    }
  }

  showLanguagePicker() {
    const picker = document.createElement("div");
    picker.className = "fixed inset-0 z-50 flex items-center justify-center bg-surface/95 backdrop-blur-md px-margin-page";
    picker.innerHTML = `
      <div class="w-full max-w-xl bg-surface-container-high rounded-3xl border-4 border-primary p-8 flex flex-col gap-6 shadow-2xl">
        <h2 class="font-headline-lg text-headline-lg font-bold text-center text-on-surface">Select Language / ভাষা নিৰ্বাচন</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${Object.keys(TRANSLATIONS).map(code => `
            <button data-lang-code="${code}" class="btn-select-lang h-[80px] rounded-xl border-4 ${voiceService.currentLanguage === code ? 'bg-primary text-on-primary border-primary-fixed' : 'bg-surface-container border-outline text-on-surface hover:bg-secondary-container'} flex items-center justify-center gap-3 font-body-xl font-bold active:scale-95 cursor-pointer">
              <span>${TRANSLATIONS[code].lang_name}</span>
            </button>
          `).join('')}
        </div>
        <button id="btn-close-lang" class="h-touch-target-min w-full bg-error-container text-on-error-container rounded-xl font-bold mt-2 cursor-pointer">Close</button>
      </div>
    `;

    document.body.appendChild(picker);

    picker.querySelectorAll('.btn-select-lang').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.langCode;
        voiceService.setLanguage(code);
        this.currentPatient.preferred_language = code;
        picker.remove();
        this.updateTopBar();
        this.renderHome();
        voiceService.speak("welcome");
      });
    });

    picker.querySelector('#btn-close-lang').addEventListener('click', () => picker.remove());
  }

  showVoiceAssistantModal() {
    const lang = voiceService.currentLanguage;
    const langData = TRANSLATIONS[lang] || TRANSLATIONS.en;

    const modal = document.createElement("div");
    modal.className = "fixed inset-0 z-50 flex items-center justify-center bg-surface/95 backdrop-blur-md px-margin-page py-6";
    modal.innerHTML = `
      <div class="w-full max-w-2xl bg-surface-container-high rounded-3xl border-4 border-primary p-8 flex flex-col items-center text-center gap-6 shadow-2xl animate-fade-in relative">
        <div class="flex items-center justify-between w-full border-b border-outline pb-3">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-teal-400 text-3xl">mic</span>
            <h2 class="font-headline-lg text-headline-lg font-bold text-on-surface">${langData.voice_help || "Voice AI Assistant"}</h2>
          </div>
          <span class="text-xs font-bold px-3 py-1 bg-teal-950 text-teal-300 border border-teal-800 rounded-full uppercase">
            ${langData.lang_name.split(' ')[0]} • Active
          </span>
        </div>

        <!-- Big Glowing Animated Mic -->
        <button id="btn-modal-mic" class="w-32 h-32 rounded-full bg-teal-600 hover:bg-teal-500 border-4 border-teal-300 text-white flex items-center justify-center shadow-2xl active:scale-95 transition-all cursor-pointer ring-8 ring-teal-500/30 animate-pulse">
          <span class="material-symbols-outlined" style="font-size: 64px;">mic</span>
        </button>

        <div class="space-y-2">
          <p id="voice-status-text" class="text-xl font-bold text-teal-300">Listening... Speak now</p>
          <p id="voice-transcript-text" class="text-base text-slate-200 bg-slate-950/80 p-4 rounded-xl border border-outline min-h-[60px] flex items-center justify-center italic">
            "Say Home, Play Memory Game, Medicine, or Call Caregiver"
          </p>
        </div>

        <!-- Quick 1-Tap Command Chips for Accessibility -->
        <div class="w-full">
          <p class="text-xs text-slate-400 font-bold mb-3 uppercase tracking-wider">Quick Commands (1-Tap):</p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button data-quick-cmd="home" class="btn-quick-voice p-3 bg-surface-container hover:bg-primary hover:text-on-primary rounded-xl border border-outline font-bold text-sm flex flex-col items-center gap-1 active:scale-95 cursor-pointer">
              <span>🏠</span>
              <span>Home / ঘৰ</span>
            </button>
            <button data-quick-cmd="memory" class="btn-quick-voice p-3 bg-surface-container hover:bg-primary hover:text-on-primary rounded-xl border border-outline font-bold text-sm flex flex-col items-center gap-1 active:scale-95 cursor-pointer">
              <span>🎴</span>
              <span>Memory Game</span>
            </button>
            <button data-quick-cmd="medicine" class="btn-quick-voice p-3 bg-surface-container hover:bg-primary hover:text-on-primary rounded-xl border border-outline font-bold text-sm flex flex-col items-center gap-1 active:scale-95 cursor-pointer">
              <span>💊</span>
              <span>Take Medicine</span>
            </button>
            <button data-quick-cmd="caregiver" class="btn-quick-voice p-3 bg-rose-950/70 hover:bg-rose-800 text-rose-200 rounded-xl border border-rose-500 font-bold text-sm flex flex-col items-center gap-1 active:scale-95 cursor-pointer">
              <span>📞</span>
              <span>Call Caregiver</span>
            </button>
          </div>
        </div>

        <button id="btn-close-voice-modal" class="w-full py-4 bg-surface-container border-2 border-outline text-on-surface font-bold rounded-xl text-base cursor-pointer hover:bg-secondary-container">
          Close Voice Assistant
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    const statusEl = modal.querySelector('#voice-status-text');
    const transcriptEl = modal.querySelector('#voice-transcript-text');
    const micBtn = modal.querySelector('#btn-modal-mic');

    // Start speech recognition listening immediately
    voiceService.startListening(
      (transcript, isFinal) => {
        if (transcriptEl) transcriptEl.innerText = `"${transcript}"`;
        if (isFinal && statusEl) {
          statusEl.innerText = "Command Recognized ✓";
          setTimeout(() => {
            modal.remove();
          }, 1200);
        }
      },
      (isListening) => {
        if (micBtn) {
          if (isListening) {
            micBtn.className = "w-32 h-32 rounded-full bg-teal-600 border-4 border-teal-300 text-white flex items-center justify-center shadow-2xl ring-8 ring-teal-500/30 animate-pulse cursor-pointer";
            if (statusEl) statusEl.innerText = "Listening... Speak in Assamese, Hindi, or English";
          } else {
            micBtn.className = "w-32 h-32 rounded-full bg-slate-800 border-4 border-outline text-slate-400 flex items-center justify-center cursor-pointer";
            if (statusEl) statusEl.innerText = "Tap mic to speak again";
          }
        }
      }
    );

    micBtn.addEventListener('click', () => {
      voiceService.toggleListening(
        (transcript, isFinal) => {
          if (transcriptEl) transcriptEl.innerText = `"${transcript}"`;
          if (isFinal) {
            setTimeout(() => modal.remove(), 1200);
          }
        },
        (isListening) => {
          if (statusEl) statusEl.innerText = isListening ? "Listening... Speak now" : "Tap mic to speak";
        }
      );
    });

    modal.querySelectorAll('.btn-quick-voice').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.quickCmd;
        voiceService.stopListening();
        modal.remove();
        voiceService.handleVoiceCommand(cmd);
      });
    });

    modal.querySelector('#btn-close-voice-modal').addEventListener('click', () => {
      voiceService.stopListening();
      modal.remove();
    });
  }

  showRegisterPatientModal() {
    const modal = document.createElement("div");
    modal.className = "fixed inset-0 z-50 flex items-center justify-center bg-surface/95 backdrop-blur-md px-margin-page py-6 overflow-y-auto";
    modal.innerHTML = `
      <div class="w-full max-w-2xl bg-surface-container-high rounded-3xl border-4 border-primary p-8 flex flex-col gap-5 shadow-2xl my-auto">
        <div class="flex items-center justify-between border-b border-outline pb-3">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-teal-400 text-4xl">person_add</span>
            <h2 class="font-headline-lg text-headline-lg font-bold text-on-surface">Register New Patient</h2>
          </div>
          <button id="btn-switch-preset" class="px-4 py-2 bg-secondary-container hover:bg-secondary text-on-surface rounded-xl font-bold text-xs">Switch Profile</button>
        </div>

        <form id="form-register-patient" class="space-y-4 text-xs font-semibold">
          <div>
            <label class="block text-slate-300 mb-1 font-bold">Patient Full Name:</label>
            <input id="reg-name" type="text" placeholder="e.g. Bhaben Sharma" class="w-full bg-slate-950 border-2 border-outline rounded-xl p-3 text-slate-100 font-bold focus:border-primary text-base" required />
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-slate-300 mb-1 font-bold">Age (Years):</label>
              <input id="reg-age" type="number" value="72" min="50" max="100" class="w-full bg-slate-950 border-2 border-outline rounded-xl p-3 text-slate-100 font-bold focus:border-primary text-base" required />
            </div>
            <div>
              <label class="block text-slate-300 mb-1 font-bold">Gender:</label>
              <select id="reg-gender" class="w-full bg-slate-950 border-2 border-outline rounded-xl p-3 text-slate-100 font-bold focus:border-primary text-base">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-300 mb-1 font-bold">Education (Years):</label>
              <input id="reg-edu" type="number" value="10" min="0" max="25" class="w-full bg-slate-950 border-2 border-outline rounded-xl p-3 text-slate-100 font-bold focus:border-primary text-base" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-300 mb-1 font-bold">Preferred Language:</label>
              <select id="reg-lang" class="w-full bg-slate-950 border-2 border-outline rounded-xl p-3 text-slate-100 font-bold focus:border-primary text-base">
                <option value="as">অসমীয়া (Assamese)</option>
                <option value="bn">বাংলা (Bengali)</option>
                <option value="kha">Ka Ktien Khasi</option>
                <option value="lus">Mizo ṭawng</option>
                <option value="mni">মৈতৈলোন্ (Manipuri)</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-300 mb-1 font-bold">NER Region / State:</label>
              <select id="reg-region" class="w-full bg-slate-950 border-2 border-outline rounded-xl p-3 text-slate-100 font-bold focus:border-primary text-base">
                <option value="Assam (Guwahati)">Assam (Guwahati)</option>
                <option value="Nagaland (Kohima)">Nagaland (Kohima)</option>
                <option value="Mizoram (Aizawl)">Mizoram (Aizawl)</option>
                <option value="Meghalaya (Shillong)">Meghalaya (Shillong)</option>
                <option value="Manipur (Imphal)">Manipur (Imphal)</option>
                <option value="Tripura (Agartala)">Tripura (Agartala)</option>
                <option value="Arunachal (Itanagar)">Arunachal (Itanagar)</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-slate-300 mb-1 font-bold">Dementia Clinical Stage:</label>
            <select id="reg-stage" class="w-full bg-slate-950 border-2 border-outline rounded-xl p-3 text-slate-100 font-bold focus:border-primary text-base">
              <option value="MCI">MCI (Mild Cognitive Impairment)</option>
              <option value="Mild Dementia">Mild Dementia</option>
              <option value="Moderate Dementia">Moderate Dementia</option>
              <option value="Severe Dementia">Severe Dementia</option>
            </select>
          </div>

          <!-- Dynamic Caregiver Section -->
          <div class="p-4 bg-slate-950 rounded-2xl border border-outline space-y-3">
            <h4 class="text-sm font-bold text-teal-300 flex items-center gap-2">
              <span class="material-symbols-outlined text-lg">health_and_safety</span>
              <span>Assigned Caregiver & Emergency Contact</span>
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-slate-400 mb-1 font-bold">Caregiver Name:</label>
                <input id="reg-cg-name" type="text" placeholder="e.g. Rahul Sharma" class="w-full bg-slate-900 border border-outline rounded-xl p-2.5 text-slate-100 font-medium text-sm focus:border-primary" required />
              </div>
              <div>
                <label class="block text-slate-400 mb-1 font-bold">Relationship:</label>
                <select id="reg-cg-rel" class="w-full bg-slate-900 border border-outline rounded-xl p-2.5 text-slate-100 font-medium text-sm focus:border-primary">
                  <option value="Daughter">Daughter</option>
                  <option value="Son">Son</option>
                  <option value="Spouse">Spouse / Partner</option>
                  <option value="Nurse / Attendant">Nurse / Attendant</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Relative">Relative</option>
                  <option value="Clinician">Clinician</option>
                </select>
              </div>
              <div>
                <label class="block text-slate-400 mb-1 font-bold">Emergency Phone:</label>
                <input id="reg-cg-phone" type="tel" value="+91 98640-12345" class="w-full bg-slate-900 border border-outline rounded-xl p-2.5 text-slate-100 font-medium text-sm focus:border-primary" />
              </div>
            </div>
          </div>

          <div class="flex gap-3 pt-3">
            <button type="submit" class="flex-1 py-4 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-xl text-base shadow-lg cursor-pointer active:scale-95 transition-transform">
              ✓ Save & Activate Patient Profile
            </button>
            <button type="button" id="btn-cancel-reg" class="px-6 py-4 bg-surface-container border-2 border-outline text-on-surface font-bold rounded-xl text-base cursor-pointer">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-switch-preset').addEventListener('click', () => {
      modal.remove();
      this.showSwitchPatientModal();
    });

    modal.querySelector('#btn-cancel-reg').addEventListener('click', () => modal.remove());

    modal.querySelector('#form-register-patient').addEventListener('submit', async (e) => {
      e.preventDefault();
      const newId = "p-" + crypto.randomUUID().substring(0, 8);
      const newPatient = {
        id: newId,
        name: modal.querySelector('#reg-name').value.trim(),
        age: parseInt(modal.querySelector('#reg-age').value) || 70,
        gender: modal.querySelector('#reg-gender').value,
        education_years: parseInt(modal.querySelector('#reg-edu').value) || 10,
        preferred_language: modal.querySelector('#reg-lang').value,
        region: modal.querySelector('#reg-region').value,
        dementia_stage: modal.querySelector('#reg-stage').value,
        caregiver_name: modal.querySelector('#reg-cg-name').value.trim(),
        caregiver_relation: modal.querySelector('#reg-cg-rel').value,
        caregiver_phone: modal.querySelector('#reg-cg-phone').value.trim()
      };

      // 1. Save locally in IndexedDB
      await localDB.savePatientProfile(newPatient);
      this.currentPatient = newPatient;
      voiceService.setLanguage(newPatient.preferred_language);
      syncManager.patientId = newPatient.id;

      // 2. Post to backend REST API
      try {
        await fetch("http://localhost:8000/api/v1/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newPatient)
        });
      } catch (err) {
        console.warn("Backend offline, profile saved locally in IndexedDB:", err);
      }

      modal.remove();
      this.updateTopBar();
      this.renderHome();
      voiceService.speak("welcome");
      syncManager.attemptSync();
    });
  }

  async showSwitchPatientModal() {
    let patientList = [
      { id: "p-assam-001", name: "Priyom Barua", region: "Assam (Guwahati)", preferred_language: "as", dementia_stage: "MCI", caregiver_name: "Anjali Barua", caregiver_relation: "Daughter" },
      { id: "p-naga-002", name: "Temsula Ao", region: "Nagaland (Kohima)", preferred_language: "en", dementia_stage: "Mild Dementia", caregiver_name: "Sentila Ao", caregiver_relation: "Daughter" },
      { id: "p-mizo-003", name: "Lalrinpuia Sailo", region: "Mizoram (Aizawl)", preferred_language: "lus", dementia_stage: "MCI", caregiver_name: "Zothansanga Sailo", caregiver_relation: "Son" },
      { id: "p-megh-004", name: "Daplin Lyngdoh", region: "Meghalaya (Shillong)", preferred_language: "kha", dementia_stage: "Moderate Dementia", caregiver_name: "Baphilarisha Lyngdoh", caregiver_relation: "Nurse" }
    ];

    // Attempt to fetch live registered patients from backend
    try {
      const res = await fetch("http://localhost:8000/api/v1/patients");
      if (res.ok) {
        const remotePatients = await res.json();
        if (remotePatients && remotePatients.length > 0) {
          // Merge unique patients by id
          const idMap = new Map();
          patientList.forEach(p => idMap.set(p.id, p));
          remotePatients.forEach(p => idMap.set(p.id, p));
          patientList = Array.from(idMap.values());
        }
      }
    } catch (err) {
      console.warn("Could not fetch remote patient list, using local records:", err);
    }

    const modal = document.createElement("div");
    modal.className = "fixed inset-0 z-50 flex items-center justify-center bg-surface/95 backdrop-blur-md px-margin-page py-6 overflow-y-auto";
    modal.innerHTML = `
      <div class="w-full max-w-xl bg-surface-container-high rounded-3xl border-4 border-primary p-8 flex flex-col gap-5 shadow-2xl my-auto">
        <div class="flex items-center justify-between border-b border-outline pb-3">
          <h2 class="font-headline-lg text-headline-lg font-bold text-on-surface">Select Patient Profile</h2>
          <span class="text-xs text-teal-400 font-bold bg-teal-950 px-3 py-1 rounded-full border border-teal-800">
            ${patientList.length} Registered Patients
          </span>
        </div>
        
        <div class="space-y-3 max-h-[360px] overflow-y-auto pr-1">
          ${patientList.map(p => `
            <button data-patient-id="${p.id}" class="btn-select-preset w-full p-4 rounded-xl border-2 ${this.currentPatient.id === p.id ? 'bg-primary text-on-primary border-primary-fixed' : 'bg-surface-container border-outline text-on-surface hover:bg-secondary-container'} flex items-center justify-between font-bold text-left cursor-pointer active:scale-95 transition-all">
              <div>
                <p class="text-base font-bold">${p.name}</p>
                <p class="text-xs opacity-80 font-normal mt-0.5">${p.region} • Stage: ${p.dementia_stage}</p>
                <p class="text-[11px] text-teal-300 font-medium mt-0.5">Caregiver: ${p.caregiver_name || 'Caregiver'} (${p.caregiver_relation || 'Family'})</p>
              </div>
              <span class="text-xs uppercase px-2.5 py-1 bg-black/40 rounded-lg font-bold border border-white/20">
                ${p.preferred_language || 'as'}
              </span>
            </button>
          `).join('')}
        </div>

        <div class="flex gap-3 pt-2">
          <button id="btn-open-reg-from-switch" class="flex-1 py-3.5 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-xl cursor-pointer shadow-md active:scale-95">
            + Register New Patient
          </button>
          <button id="btn-close-switch" class="px-6 py-3.5 bg-surface-container border-2 border-outline text-on-surface font-bold rounded-xl cursor-pointer">
            Close
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll('.btn-select-preset').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.patientId;
        const selected = patientList.find(p => p.id === id);
        if (selected) {
          this.currentPatient = {
            id: selected.id,
            name: selected.name,
            age: selected.age || 72,
            gender: selected.gender || "Male",
            region: selected.region,
            preferred_language: selected.preferred_language || "as",
            dementia_stage: selected.dementia_stage || "MCI",
            caregiver_name: selected.caregiver_name || "Anjali Barua",
            caregiver_relation: selected.caregiver_relation || "Caregiver",
            caregiver_phone: selected.caregiver_phone || "+91 98640-12345"
          };
          await localDB.savePatientProfile(this.currentPatient);
          voiceService.setLanguage(this.currentPatient.preferred_language);
          syncManager.patientId = selected.id;
          modal.remove();
          this.updateTopBar();
          this.renderHome();
          voiceService.speak("welcome");
          syncManager.attemptSync();
        }
      });
    });

    modal.querySelector('#btn-open-reg-from-switch').addEventListener('click', () => {
      modal.remove();
      this.showRegisterPatientModal();
    });

    modal.querySelector('#btn-close-switch').addEventListener('click', () => modal.remove());
  }

  showSettingsModal() {
    const modal = document.createElement("div");
    modal.className = "fixed inset-0 z-50 flex items-center justify-center bg-surface/95 backdrop-blur-md px-margin-page";
    modal.innerHTML = `
      <div class="w-full max-w-xl bg-surface-container-high rounded-3xl border-4 border-primary p-8 flex flex-col gap-6 shadow-2xl">
        <h2 class="font-headline-lg text-headline-lg font-bold text-center text-on-surface">${voiceService.getTranslation("settings")}</h2>
        
        <!-- Text Size Scaling -->
        <div>
          <label class="font-body-xl font-bold text-on-surface mb-3 block">Text Size (ফন্টৰ আকাৰ):</label>
          <div class="flex gap-4">
            <button id="btn-font-sm" class="flex-1 h-[70px] rounded-xl border-2 border-outline bg-surface-container font-bold text-xl active:scale-95 cursor-pointer">A- Normal</button>
            <button id="btn-font-md" class="flex-1 h-[70px] rounded-xl border-2 border-outline bg-surface-container font-bold text-2xl active:scale-95 cursor-pointer">A Large</button>
            <button id="btn-font-lg" class="flex-1 h-[70px] rounded-xl border-4 border-primary bg-primary text-on-primary font-bold text-3xl active:scale-95 cursor-pointer">A+ Extra</button>
          </div>
        </div>

        <!-- Theme Selection -->
        <div>
          <label class="font-body-xl font-bold text-on-surface mb-3 block">Display Contrast Theme:</label>
          <div class="grid grid-cols-2 gap-3">
            <button data-theme-name="dark" class="btn-theme-pick h-[60px] rounded-xl bg-slate-900 text-white border-2 border-white font-bold cursor-pointer">High Contrast</button>
            <button data-theme-name="amber" class="btn-theme-pick h-[60px] rounded-xl bg-amber-950 text-amber-200 border-2 border-amber-500 font-bold cursor-pointer">Amber Night</button>
          </div>
        </div>

        <button id="btn-close-settings" class="h-touch-target-primary w-full bg-[#059669] text-white rounded-xl font-bold font-body-xl mt-4 cursor-pointer">Save & Close</button>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-font-sm').addEventListener('click', () => this.applyFontSize(0.9));
    modal.querySelector('#btn-font-md').addEventListener('click', () => this.applyFontSize(1.0));
    modal.querySelector('#btn-font-lg').addEventListener('click', () => this.applyFontSize(1.15));

    modal.querySelectorAll('.btn-theme-pick').forEach(btn => {
      btn.addEventListener('click', () => this.applyTheme(btn.dataset.themeName));
    });

    modal.querySelector('#btn-close-settings').addEventListener('click', () => modal.remove());
  }

  attachGlobalEvents() {
    // Top Bar Register Patient Button
    document.getElementById("btn-top-register")?.addEventListener("click", () => this.showRegisterPatientModal());

    // Top Bar Language Picker Button
    document.getElementById("btn-top-lang")?.addEventListener("click", () => this.showLanguagePicker());
    
    // Top Bar Settings Button
    document.getElementById("btn-top-settings")?.addEventListener("click", () => this.showSettingsModal());

    // Top Bar Airplane Mode Sync Pill Toggle
    document.getElementById("sync-status-badge")?.addEventListener("click", () => {
      const isAirplane = syncManager.toggleAirplaneMode();
      voiceService.speak(isAirplane ? "Airplane mode active. Games and records are saved offline." : "Online sync active.");
    });

    // Bottom Navigation Bar - Home Button
    document.getElementById("nav-home")?.addEventListener("click", () => {
      if (this.currentView !== "home") {
        this.renderHome();
      }
    });

    // Bottom Navigation Bar - Interactive Voice Help Assistant
    document.getElementById("nav-voice-help")?.addEventListener("click", () => {
      this.showVoiceAssistantModal();
    });

    // Overlay modal took-it & remind buttons
    document.getElementById("btn-took-it")?.addEventListener("click", () => {
      this.markMedicationTaken();
    });

    document.getElementById("btn-remind")?.addEventListener("click", () => {
      this.closeMedicationModal();
      voiceService.speak("Reminder set. We will remind you in 10 minutes.");
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.patientApp = new PatientApp();
});
