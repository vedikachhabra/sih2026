import React, { useState } from 'react';
import { Radio, Wifi, WifiOff, Play, CheckCircle2, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';

export default function LiveSyncSimulator({ onSyncCompleted }) {
  const [isAirplaneMode, setIsAirplaneMode] = useState(true);
  const [simulatedQueue, setSimulatedQueue] = useState([]);
  const [syncStatus, setSyncStatus] = useState("idle"); // 'idle', 'syncing', 'success', 'error'
  const [selectedGame, setSelectedGame] = useState("memory");
  const [accuracy, setAccuracy] = useState(0.85);
  const [reactionTime, setReactionTime] = useState(1450);

  const handleSimulateGameRound = () => {
    const newSession = {
      local_id: "sim-" + crypto.randomUUID(),
      game_type: selectedGame,
      difficulty_level: 2,
      accuracy: parseFloat(accuracy),
      avg_reaction_time_ms: parseInt(reactionTime),
      hints_used: 1,
      rounds_completed: 1,
      completion_status: "completed",
      started_at: new Date(Date.now() - 300000).toISOString(),
      ended_at: new Date().toISOString(),
      timestamp: new Date().toLocaleTimeString()
    };

    setSimulatedQueue(prev => [...prev, newSession]);
  };

  const handleTriggerSync = async () => {
    if (simulatedQueue.length === 0) return;
    setSyncStatus("syncing");

    try {
      const payload = {
        patient_id: "p-assam-001",
        sessions: simulatedQueue
      };

      const res = await fetch("http://localhost:8000/api/v1/sync/game-sessions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Sync failed");
      const data = await res.json();
      
      setSyncStatus("success");
      setSimulatedQueue([]);
      setIsAirplaneMode(false);

      if (onSyncCompleted) {
        onSyncCompleted(data);
      }
    } catch (err) {
      console.error(err);
      setSyncStatus("error");
    }
  };

  return (
    <div className="bg-slate-900 p-8 rounded-3xl border-2 border-amber-500/40 shadow-2xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-xl text-white">SIH Live Demo: Offline-First & Sync Simulator</h2>
              <p className="text-xs text-amber-300/80 font-semibold">
                Demonstrates 100% Offline Game Logging → Opportunistic Batch Ingestion → Real-Time Analytics Update
              </p>
            </div>
          </div>
        </div>

        {/* Airplane Mode Toggle */}
        <button
          onClick={() => setIsAirplaneMode(!isAirplaneMode)}
          className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-200 border-2 ${
            isAirplaneMode
              ? 'bg-amber-950/70 border-amber-500 text-amber-300 shadow-lg shadow-amber-950/50'
              : 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-950/50'
          }`}
        >
          {isAirplaneMode ? <WifiOff className="w-5 h-5" /> : <Wifi className="w-5 h-5 text-emerald-400" />}
          <span>{isAirplaneMode ? '✈️ Patient in Airplane Mode (Offline)' : '📶 Wi-Fi Connected (Online)'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 1: Simulate Offline Gameplay */}
        <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-base flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center text-xs">1</span>
              Simulate Patient Game Round
            </h3>
            <span className="text-xs text-slate-500">IndexedDB Write</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Cognitive Mini-Game:</label>
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 font-semibold focus:outline-none focus:border-teal-500"
              >
                <option value="memory">🎴 Memory Pairs (Working Memory)</option>
                <option value="attention">🔍 Odd-One-Out (Selective Attention)</option>
                <option value="sequencing">🔢 Daily Routine Sequencing (Executive Function)</option>
                <option value="pattern">🧩 Pattern Match (Visuospatial)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Accuracy: {Math.round(accuracy * 100)}%</label>
                <input
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.05"
                  value={accuracy}
                  onChange={(e) => setAccuracy(e.target.value)}
                  className="w-full accent-teal-400"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Reaction Time: {reactionTime} ms</label>
                <input
                  type="range"
                  min="800"
                  max="3500"
                  step="50"
                  value={reactionTime}
                  onChange={(e) => setReactionTime(e.target.value)}
                  className="w-full accent-amber-400"
                />
              </div>
            </div>

            <button
              onClick={handleSimulateGameRound}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 font-bold rounded-xl border border-slate-600 flex items-center justify-center gap-2 transition-transform cursor-pointer"
            >
              <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Log Offline Game Session</span>
            </button>
          </div>
        </div>

        {/* Step 2: Unsynced Local Storage Queue */}
        <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-200 text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center text-xs">2</span>
                On-Device Queue ({simulatedQueue.length} Sessions)
              </h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${simulatedQueue.length > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'}`}>
                synced = 0
              </span>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
              {simulatedQueue.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs italic">
                  Queue empty. Click "Log Offline Game Session" to queue on-device sessions without internet.
                </div>
              ) : (
                simulatedQueue.map((item, idx) => (
                  <div key={item.local_id} className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-teal-400">#{idx + 1} {item.game_type.toUpperCase()}</span>
                      <span className="text-slate-400">({Math.round(item.accuracy * 100)}% acc, {item.avg_reaction_time_ms}ms)</span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono">UUID: {item.local_id.substring(0, 8)}...</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <button
              onClick={handleTriggerSync}
              disabled={simulatedQueue.length === 0 || syncStatus === "syncing"}
              className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all ${
                simulatedQueue.length === 0
                  ? 'bg-slate-800/40 text-slate-600 border border-slate-800 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-900/40 border border-teal-400 cursor-pointer active:scale-95'
              }`}
            >
              {syncStatus === "syncing" ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-white" />
                  <span>Pushing Batch Upsert to FastAPI Ingestion Engine...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span>Trigger Batch Sync ({simulatedQueue.length} Sessions)</span>
                </>
              )}
            </button>

            {syncStatus === "success" && (
              <p className="text-xs text-emerald-400 font-bold text-center mt-2 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Batch successfully ingested! Dashboard metrics & trend graphs updated.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
