import React, { useState, useEffect } from 'react';
import { CalendarCheck, Plus, Clock, Pill, BellRing, Save, Trash2, Utensils, Stethoscope, CheckCircle2 } from 'lucide-react';
import { fetchPatientReminders, addPatientReminder, deletePatientReminder } from '../services/api';

export default function CarePlansPage({ patients = [], onRefresh }) {
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || "p-assam-001");
  const [reminders, setReminders] = useState([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState("medication");
  const [timeOfDay, setTimeOfDay] = useState("08:00");
  const [dosage, setDosage] = useState("5mg");
  const [submitting, setSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const activePatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  const loadReminders = async (patientId) => {
    if (!patientId) return;
    setLoadingReminders(true);
    try {
      const data = await fetchPatientReminders(patientId);
      setReminders(data || []);
    } catch (err) {
      console.error("Failed to fetch patient care plan reminders:", err);
    } finally {
      setLoadingReminders(false);
    }
  };

  useEffect(() => {
    if (selectedPatientId) {
      loadReminders(selectedPatientId);
    }
  }, [selectedPatientId]);

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    if (!title.trim() || !selectedPatientId) return;

    setSubmitting(true);
    try {
      await addPatientReminder(selectedPatientId, {
        patient_id: selectedPatientId,
        title: title.trim(),
        task_type: taskType,
        time_of_day: timeOfDay,
        dosage: dosage.trim() || "1 Dose",
        audio_prompt_key: taskType === "medication" ? "med_morning" : "hydration_midday",
        cron_schedule: `0 ${parseInt(timeOfDay.split(':')[0]) || 8} * * *`
      });

      setTitle("");
      setDosage("5mg");
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      await loadReminders(selectedPatientId);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to add reminder:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    try {
      await deletePatientReminder(selectedPatientId, reminderId);
      await loadReminders(selectedPatientId);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to delete reminder:", err);
    }
  };

  const getTaskIcon = (type) => {
    switch (type) {
      case 'medication':
        return <Pill className="w-5 h-5 text-teal-400" />;
      case 'hydration':
        return <Clock className="w-5 h-5 text-cyan-400" />;
      case 'meal':
        return <Utensils className="w-5 h-5 text-amber-400" />;
      case 'appointment':
        return <Stethoscope className="w-5 h-5 text-rose-400" />;
      default:
        return <BellRing className="w-5 h-5 text-violet-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Care Plan & Routine Manager</h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure medication regimens, hydration schedules, and regional voice prompt triggers pushed to patient devices.
          </p>
        </div>

        {/* Patient Switcher */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-bold">Patient:</label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.region})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form to Add Schedule */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-teal-400" />
            <span>Add Care Routine / Medication</span>
          </h3>

          <form onSubmit={handleCreateReminder} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Medication / Task Name:</label>
              <input
                type="text"
                placeholder="e.g. Donepezil Tablets / Morning Hydration"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-teal-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Type:</label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="medication">💊 Medication</option>
                  <option value="hydration">💧 Hydration</option>
                  <option value="meal">🍲 Meal</option>
                  <option value="appointment">🏥 Doctor Visit</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Scheduled Time:</label>
                <input
                  type="time"
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-bold">Dosage / Instructions:</label>
              <input
                type="text"
                placeholder="e.g. 5mg with fresh water"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer shadow-lg shadow-teal-900/40"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? "Saving & Syncing..." : "Deploy to Patient Tablet"}</span>
            </button>

            {savedSuccess && (
              <div className="p-3 bg-emerald-950/70 border border-emerald-600 text-emerald-300 rounded-xl text-center font-bold flex items-center justify-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>✓ Routine saved and synced to patient device!</span>
              </div>
            )}
          </form>
        </div>

        {/* Existing Active Reminders List */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-teal-400" />
              <span>Active Care Plan for {activePatient?.name || "Selected Patient"}</span>
            </h3>
            <span className="text-xs text-teal-400 font-bold bg-teal-950 px-3 py-1 rounded-full border border-teal-800">
              {reminders.length} Active Routines
            </span>
          </div>

          {loadingReminders ? (
            <div className="h-48 flex items-center justify-center text-teal-400 font-bold text-xs">
              Loading patient care plan...
            </div>
          ) : reminders.length === 0 ? (
            <div className="p-8 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 text-center space-y-2">
              <Pill className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-slate-300">No care routines scheduled yet</p>
              <p className="text-xs text-slate-500">Use the form on the left to configure medications or hydration schedules for this patient.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((r) => (
                <div
                  key={r.id}
                  className="p-4 bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-all group shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      {getTaskIcon(r.task_type)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{r.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Time: {r.time_of_day} • {r.dosage ? `Dosage: ${r.dosage} • ` : ''}Type: <span className="capitalize">{r.task_type}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800">
                      Active Routine
                    </span>
                    <button
                      onClick={() => handleDeleteReminder(r.id)}
                      title="Delete this routine"
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
