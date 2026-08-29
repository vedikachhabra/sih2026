import React from 'react';
import { Users, Activity, CheckCircle, Bell, ArrowUpRight, TrendingUp, TrendingDown, ArrowRight, ShieldCheck } from 'lucide-react';
import TrendCharts from '../components/TrendCharts';

export default function Dashboard({ patients = [], alerts = [], onSelectPatient, activeTrends = null, onOpenRegister }) {
  // Aggregate stats
  const totalPatients = patients.length;
  const activeAlerts = alerts.filter(a => !a.acknowledged).length;
  const mciCount = patients.filter(p => p.dementia_stage.toLowerCase() === 'mci').length;
  const dementiaCount = patients.filter(p => ['mild', 'moderate', 'severe'].includes(p.dementia_stage.toLowerCase())).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 p-8 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider bg-teal-950/80 px-3 py-1 rounded-full border border-teal-800/80 inline-block">
              Clinical Tele-Monitoring Dashboard
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Sync Active (3s)
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">North Eastern Region Dementia Care Network</h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Continuous on-device cognitive assessment, offline psychomotor tracking, and clinical decline detection across Assam, Nagaland, Mizoram, and Meghalaya.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenRegister}
            className="px-5 py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-2xl text-sm flex items-center gap-2 shadow-lg shadow-teal-900/30 active:scale-95 transition-all cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>+ Register Patient</span>
          </button>
          <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-center">
            <p className="text-xs font-bold text-slate-400">Total Patients</p>
            <p className="text-2xl font-extrabold text-teal-300 mt-0.5">{totalPatients}</p>
          </div>
          <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-center">
            <p className="text-xs font-bold text-slate-400">Active Alerts</p>
            <p className="text-2xl font-extrabold text-amber-400 mt-0.5">{activeAlerts}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">MCI Cohort</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">{mciCount} Patients</h3>
            <p className="text-[11px] text-teal-400 mt-1 flex items-center gap-1 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" /> High Training Frequency
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Dementia Stage</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">{dementiaCount} Patients</h3>
            <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> Adaptive DDA Flow
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Adherence Rate</p>
            <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">94.2%</h3>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Daily Medication & Hydration</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Mean Reaction Time</p>
            <h3 className="text-2xl font-extrabold text-cyan-300 mt-1">1620 ms</h3>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Psychomotor Baseline</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Patient Cohort Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Active Patient Trajectories</h3>
          <span className="text-xs text-slate-400">Select any patient to view detailed 30-day clinical telemetry</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {patients.map((p) => {
            const hasHighAlert = alerts.some(a => a.patient_id === p.id && a.severity === 'high' && !a.acknowledged);
            return (
              <div
                key={p.id}
                onClick={() => onSelectPatient(p.id)}
                className={`p-5 rounded-2xl bg-slate-900 border transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-95 shadow-md flex flex-col justify-between ${
                  hasHighAlert
                    ? 'border-red-500/60 hover:border-red-400 bg-red-950/10'
                    : 'border-slate-800 hover:border-teal-500/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full uppercase bg-slate-800 text-slate-300 border border-slate-700">
                      {p.dementia_stage}
                    </span>
                    {hasHighAlert && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                        <Bell className="w-3 h-3" /> Alert
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-base text-white">{p.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{p.region}</p>
                  <p className="text-xs text-slate-500 mt-1">Age: {p.age} yrs • Lang: {p.preferred_language.toUpperCase()}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-teal-400 font-bold">
                  <span>View Telemetry</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Embedded Chart Preview */}
      {activeTrends && (
        <TrendCharts dataPoints={activeTrends.data_points} patientName={activeTrends.patient_name} />
      )}
    </div>
  );
}
