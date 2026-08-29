// Local Offline Database: IndexedDB Engine
class LocalDatabase {
  constructor() {
    this.dbName = "CognitiveCareLocalDB";
    this.version = 1;
    this.db = null;
    this.initPromise = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 1. Patient profile store
        if (!db.objectStoreNames.contains("patient_profile")) {
          db.createObjectStore("patient_profile", { keyPath: "id" });
        }
        
        // 2. Game sessions store (synced: 0/1 index)
        if (!db.objectStoreNames.contains("game_sessions")) {
          const sessStore = db.createObjectStore("game_sessions", { keyPath: "id" });
          sessStore.createIndex("synced", "synced", { unique: false });
          sessStore.createIndex("started_at", "started_at", { unique: false });
        }
        
        // 3. Task logs store
        if (!db.objectStoreNames.contains("task_logs")) {
          const taskStore = db.createObjectStore("task_logs", { keyPath: "id" });
          taskStore.createIndex("synced", "synced", { unique: false });
        }
        
        // 4. Mood logs store
        if (!db.objectStoreNames.contains("mood_logs")) {
          const moodStore = db.createObjectStore("mood_logs", { keyPath: "id" });
          moodStore.createIndex("synced", "synced", { unique: false });
        }
        
        // 5. Reminders store
        if (!db.objectStoreNames.contains("reminders")) {
          db.createObjectStore("reminders", { keyPath: "id" });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.seedInitialProfile();
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error("IndexedDB error:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  async seedInitialProfile() {
    const profile = await this.getPatientProfile();
    if (!profile) {
      const defaultProfile = {
        id: "p-assam-001",
        name: "Priyom Barua",
        preferred_language: "as",
        dementia_stage: "mci",
        education_years: 10,
        region: "Assam (Guwahati)",
        last_synced_at: new Date().toISOString()
      };
      await this.savePatientProfile(defaultProfile);
    }
  }

  async savePatientProfile(profile) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("patient_profile", "readwrite");
      const store = tx.objectStore("patient_profile");
      store.put(profile);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e);
    });
  }

  async getPatientProfile() {
    await this.initPromise;
    return new Promise((resolve) => {
      const tx = this.db.transaction("patient_profile", "readonly");
      const store = tx.objectStore("patient_profile");
      const req = store.get("p-assam-001");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }

  // --- Game Sessions ---
  async saveGameSession(sessionData) {
    await this.initPromise;
    const sessionRecord = {
      id: sessionData.id || ("local-" + crypto.randomUUID()),
      patient_id: sessionData.patient_id || "p-assam-001",
      game_type: sessionData.game_type,
      difficulty_level: sessionData.difficulty_level || 1,
      accuracy: sessionData.accuracy,
      avg_reaction_time_ms: sessionData.avg_reaction_time_ms,
      hints_used: sessionData.hints_used || 0,
      rounds_completed: sessionData.rounds_completed || 1,
      completion_status: sessionData.completion_status || "completed",
      started_at: sessionData.started_at || new Date().toISOString(),
      ended_at: sessionData.ended_at || new Date().toISOString(),
      synced: 0 // 0 = pending sync, 1 = synced
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("game_sessions", "readwrite");
      const store = tx.objectStore("game_sessions");
      store.put(sessionRecord);
      tx.oncomplete = () => resolve(sessionRecord);
      tx.onerror = (e) => reject(e);
    });
  }

  async getUnsyncedSessions() {
    await this.initPromise;
    return new Promise((resolve) => {
      const tx = this.db.transaction("game_sessions", "readonly");
      const store = tx.objectStore("game_sessions");
      const index = store.index("synced");
      const req = index.getAll(0);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async markSessionsSynced(ids) {
    await this.initPromise;
    return new Promise((resolve) => {
      const tx = this.db.transaction("game_sessions", "readwrite");
      const store = tx.objectStore("game_sessions");
      ids.forEach((id) => {
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          if (getReq.result) {
            const updated = getReq.result;
            updated.synced = 1;
            store.put(updated);
          }
        };
      });
      tx.oncomplete = () => resolve(true);
    });
  }

  // --- Task Logs (Medication & Hydration) ---
  async saveTaskLog(taskData) {
    await this.initPromise;
    const taskRecord = {
      id: taskData.id || ("task-" + crypto.randomUUID()),
      patient_id: "p-assam-001",
      task_type: taskData.task_type || "medication",
      title: taskData.title || "Morning Pill",
      scheduled_time: taskData.scheduled_time || new Date().toISOString(),
      completed_time: taskData.completed_time || new Date().toISOString(),
      status: taskData.status || "done",
      notes: taskData.notes || "",
      synced: 0
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("task_logs", "readwrite");
      const store = tx.objectStore("task_logs");
      store.put(taskRecord);
      tx.oncomplete = () => resolve(taskRecord);
      tx.onerror = (e) => reject(e);
    });
  }

  async getUnsyncedTasks() {
    await this.initPromise;
    return new Promise((resolve) => {
      const tx = this.db.transaction("task_logs", "readonly");
      const store = tx.objectStore("task_logs");
      const index = store.index("synced");
      const req = index.getAll(0);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async markTasksSynced(ids) {
    await this.initPromise;
    return new Promise((resolve) => {
      const tx = this.db.transaction("task_logs", "readwrite");
      const store = tx.objectStore("task_logs");
      ids.forEach((id) => {
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          if (getReq.result) {
            const updated = getReq.result;
            updated.synced = 1;
            store.put(updated);
          }
        };
      });
      tx.oncomplete = () => resolve(true);
    });
  }

  // --- Mood Logs ---
  async saveMoodLog(moodScore, notes = "") {
    await this.initPromise;
    const moodRecord = {
      id: "mood-" + crypto.randomUUID(),
      patient_id: "p-assam-001",
      mood_score: moodScore,
      logged_at: new Date().toISOString(),
      notes: notes,
      synced: 0
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("mood_logs", "readwrite");
      const store = tx.objectStore("mood_logs");
      store.put(moodRecord);
      tx.oncomplete = () => resolve(moodRecord);
      tx.onerror = (e) => reject(e);
    });
  }

  async getUnsyncedMoods() {
    await this.initPromise;
    return new Promise((resolve) => {
      const tx = this.db.transaction("mood_logs", "readonly");
      const store = tx.objectStore("mood_logs");
      const index = store.index("synced");
      const req = index.getAll(0);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async markMoodsSynced(ids) {
    await this.initPromise;
    return new Promise((resolve) => {
      const tx = this.db.transaction("mood_logs", "readwrite");
      const store = tx.objectStore("mood_logs");
      ids.forEach((id) => {
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          if (getReq.result) {
            const updated = getReq.result;
            updated.synced = 1;
            store.put(updated);
          }
        };
      });
      tx.oncomplete = () => resolve(true);
    });
  }
}

const localDB = new LocalDatabase();
