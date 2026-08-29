import React, { useState, useEffect } from 'react';
import { fetchCognitiveTrends, fetchCognitiveProfile, getExportReportUrl } from '../services/api';
import TrendCharts from '../components/TrendCharts';
import CognitiveRadar from '../components/CognitiveRadar';
import { ArrowLeft, Download, FileText, Activity, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function PatientDetail({ patientId, onBack }) {
  const [trends, setTrends] = useState(null);
  const [profile, setProfile] = useState(null);
  const [daysRange, setDaysRange] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [trendsData, profileData] = await Promise.all([
          fetchCognitiveTrends(patientId, daysRange),
          fetchCognitiveProfile(patientId)
        ]);
        setTrends(trendsData);
        setProfile(profileData);
      } catch (err) {
        console.error("Failed to load patient telemetry:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [patientId, daysRange]);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center text-teal-400 font-bold">
        Loading clinical cognitive telemetry...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Patients</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Days Range Selector */}
          <div className="flex bg-slate-900 rounded-xl border border-slate-800 p-1 text-xs font-semibold">
            {[7, 14, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDaysRange(d)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  daysRange === d ? 'bg-teal-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          {/* Export PDF Button */}
          <a
            href={getExportReportUrl(patientId, daysRange)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-900/40 transition-transform"
          >
            <Download className="w-4 h-4" />
            <span>Export Clinical PDF Report</span>
          </a>
        </div>
      </div>

      {/* Patient Header Card */}
      <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
            {profile?.patient_name?.substring(0, 2).toUpperCase() || 'PT'}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">{profile?.patient_name}</h2>
              <span className="text-xs font-bold px-3 py-1 rounded-full uppercase bg-teal-950 text-teal-300 border border-teal-800">
                {profile?.dementia_stage}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {profile?.region} • Age: {profile?.age} yrs • Education: {profile?.education_years} yrs (Bias-adjusted)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <p className="text-slate-400">Composite Score</p>
            <p className="text-lg font-bold text-teal-300 mt-0.5">{trends?.current_composite_score || 72}/100</p>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <p className="text-slate-400">MoCA Equiv (72172-0)</p>
            <p className="text-lg font-bold text-cyan-300 mt-0.5">{trends?.current_moca_equivalent || 22}/30</p>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <p className="text-slate-400">30D Adherence</p>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">{profile?.adherence_rate_30d || 94}%</p>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <p className="text-slate-400">Trend Status</p>
            <p className={`text-lg font-bold mt-0.5 uppercase ${trends?.overall_trend === 'declining' ? 'text-red-400' : 'text-emerald-300'}`}>
              {trends?.overall_trend || 'STABLE'}
            </p>
          </div>
        </div>
      </div>

      {/* Trajectory Charts & Radar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrendCharts dataPoints={trends?.data_points} patientName={profile?.patient_name} />
        </div>
        <div>
          <CognitiveRadar radarDomains={profile?.radar_domains} />
        </div>
      </div>
    </div>
  );
}
