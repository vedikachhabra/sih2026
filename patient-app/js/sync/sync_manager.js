// Opportunistic Sync Manager with Airplane Mode Toggle
class SyncManager {
  constructor() {
    this.apiBase = "http://localhost:8000/api/v1";
    this.isAirplaneMode = localStorage.getItem("patient_airplane_mode") === "true";
    this.isSyncing = false;
    this.lastSyncTime = localStorage.getItem("last_sync_timestamp") || null;
    this.patientId = "p-assam-001";
    
    this.initNetworkListeners();
    // Periodically attempt sync every 30 seconds if online
    setInterval(() => this.attemptSync(), 30000);
  }

  initNetworkListeners() {
    window.addEventListener("online", () => {
      console.log("Network online event detected.");
      this.attemptSync();
    });

    window.addEventListener("offline", () => {
      console.log("Network offline event detected.");
      this.updateSyncUI();
    });
  }

  toggleAirplaneMode() {
    this.isAirplaneMode = !this.isAirplaneMode;
    localStorage.setItem("patient_airplane_mode", this.isAirplaneMode);
    console.log("Airplane mode toggled:", this.isAirplaneMode);
    
    if (!this.isAirplaneMode) {
      this.attemptSync();
    }
    this.updateSyncUI();
    return this.isAirplaneMode;
  }

  isOnline() {
    return navigator.onLine && !this.isAirplaneMode;
  }

  async attemptSync() {
    if (!this.isOnline() || this.isSyncing) {
      this.updateSyncUI();
      return;
    }

    this.isSyncing = true;
    this.updateSyncUI();

    try {
      // 1. Fetch all unsynced game sessions
      const unsyncedSessions = await localDB.getUnsyncedSessions();
      if (unsyncedSessions.length > 0) {
        const payload = {
          patient_id: this.patientId,
          sessions: unsyncedSessions.map((s) => ({
            local_id: s.id,
            game_type: s.game_type,
            difficulty_level: s.difficulty_level,
            accuracy: s.accuracy,
            avg_reaction_time_ms: s.avg_reaction_time_ms,
            hints_used: s.hints_used,
            rounds_completed: s.rounds_completed,
            completion_status: s.completion_status,
            started_at: s.started_at,
            ended_at: s.ended_at,
            device_info: "Tablet-NER-PatientApp"
          }))
        };

        const res = await fetch(`${this.apiBase}/sync/game-sessions/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const ids = unsyncedSessions.map((s) => s.id);
          await localDB.markSessionsSynced(ids);
          console.log(`Synced ${ids.length} game sessions successfully.`);
        }
      }

      // 2. Fetch and push unsynced task logs (meds/hydration)
      const unsyncedTasks = await localDB.getUnsyncedTasks();
      if (unsyncedTasks.length > 0) {
        const taskPayload = {
          patient_id: this.patientId,
          tasks: unsyncedTasks.map((t) => ({
            local_id: t.id,
            task_type: t.task_type,
            title: t.title,
            scheduled_time: t.scheduled_time,
            completed_time: t.completed_time,
            status: t.status,
            notes: t.notes
          }))
        };

        const res = await fetch(`${this.apiBase}/sync/task-logs/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskPayload)
        });

        if (res.ok) {
          const ids = unsyncedTasks.map((t) => t.id);
          await localDB.markTasksSynced(ids);
        }
      }

      // 3. Fetch and push unsynced mood logs
      const unsyncedMoods = await localDB.getUnsyncedMoods();
      if (unsyncedMoods.length > 0) {
        const moodPayload = {
          patient_id: this.patientId,
          moods: unsyncedMoods.map((m) => ({
            local_id: m.id,
            mood_score: m.mood_score,
            logged_at: m.logged_at,
            notes: m.notes
          }))
        };

        const res = await fetch(`${this.apiBase}/sync/mood-logs/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(moodPayload)
        });

        if (res.ok) {
          const ids = unsyncedMoods.map((m) => m.id);
          await localDB.markMoodsSynced(ids);
        }
      }

      // 4. Pull delta updates
      const pullRes = await fetch(`${this.apiBase}/sync/pull/${this.patientId}`);
      if (pullRes.ok) {
        const delta = await pullRes.json();
        if (delta.dda_config) {
          onDeviceDDA.state.weights = {
            w1: delta.dda_config.w1_accuracy,
            w2: delta.dda_config.w2_speed,
            w3: delta.dda_config.w3_hints
          };
          onDeviceDDA.saveState();
        }

        if (delta.reminders && delta.reminders.length > 0 && window.patientApp) {
          const firstMed = delta.reminders.find(r => r.task_type === 'medication') || delta.reminders[0];
          window.patientApp.activeMedication = {
            title: firstMed.title,
            dosage: firstMed.dosage ? `${firstMed.dosage} (Scheduled: ${firstMed.time_of_day})` : `Scheduled at ${firstMed.time_of_day}`,
            time_of_day: firstMed.time_of_day
          };
          if (window.patientApp.currentView === "home") {
            window.patientApp.renderHome();
          }
        }
      }

      this.lastSyncTime = new Date().toISOString();
      localStorage.setItem("last_sync_timestamp", this.lastSyncTime);
    } catch (err) {
      console.warn("Sync attempt failed (server offline or unreachable):", err.message);
    } finally {
      this.isSyncing = false;
      this.updateSyncUI();
    }
  }

  async getPendingCount() {
    const s = await localDB.getUnsyncedSessions();
    const t = await localDB.getUnsyncedTasks();
    const m = await localDB.getUnsyncedMoods();
    return s.length + t.length + m.length;
  }

  async updateSyncUI() {
    const syncBadge = document.getElementById("sync-status-badge");
    const pendingCount = await this.getPendingCount();

    if (!syncBadge) return;

    if (this.isAirplaneMode) {
      syncBadge.innerHTML = `
        <span class="material-symbols-outlined text-amber-400 text-2xl">airplanemode_active</span>
        <span class="font-bold text-amber-300">Offline Mode (${pendingCount} Queued)</span>
      `;
      syncBadge.className = "flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-950/70 border-2 border-amber-600 cursor-pointer select-none active:scale-95";
    } else if (this.isSyncing) {
      syncBadge.innerHTML = `
        <span class="material-symbols-outlined text-teal-300 text-2xl animate-spin">sync</span>
        <span class="font-bold text-teal-200">Syncing Data...</span>
      `;
      syncBadge.className = "flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-950/70 border-2 border-teal-500 select-none";
    } else {
      syncBadge.innerHTML = `
        <span class="material-symbols-outlined text-emerald-400 text-2xl">cloud_done</span>
        <span class="font-bold text-emerald-300">Online Synced ${pendingCount > 0 ? `(${pendingCount} pending)` : ''}</span>
      `;
      syncBadge.className = "flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-950/70 border-2 border-emerald-600 cursor-pointer select-none active:scale-95";
    }
  }
}

const syncManager = new SyncManager();
