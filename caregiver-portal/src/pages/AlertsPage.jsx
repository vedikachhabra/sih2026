import React, { useState } from 'react';
import { Bell, AlertTriangle, CheckCircle, Clock, ShieldAlert, Check } from 'lucide-react';
import { acknowledgeAlert } from '../services/api';

export default function AlertsPage({ alerts = [], onRefresh }) {
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [acknowledgingId, setAcknowledgingId] = useState(null);
  const [doctorNotes, setDoctorNotes] = useState("Reviewed patient trajectory. Contacted local caregiver.");

  const filtered = alerts.filter(a => {
    if (filterSeverity === 'all') return true;
    return a.severity.toLowerCase() === filterSeverity.toLowerCase();
  });

  const handleAcknowledge = async (alertId) => {
    try {
      await acknowledgeAlert(alertId, "Dr. S. K. Barua, MD", doctorNotes);
      setAcknowledgingId(null);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error("Failed to acknowledge alert:", e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Clinical Alert & Anomaly Center</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time alerts triggered by statistical decline detectors (CUSUM), missed medications, and inactivity flags.
          </p>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex bg-slate-900 rounded-xl border border-slate-800 p-1 text-xs font-semibold">
          {['all', 'high', 'medium', 'low'].map(s => (
            <button
              key={s}
              onClick={() => setFilterSeverity(s)}
              className={`px-4 py-2 rounded-lg capitalize transition-all ${
                filterSeverity === s ? 'bg-teal-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s} Severity
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-slate-900 rounded-3xl border border-slate-800">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-60" />
            <p className="font-bold text-base text-slate-300">All alerts acknowledged and clear.</p>
            <p className="text-xs text-slate-500 mt-1">No active anomalies requiring clinician review.</p>
          </div>
        ) : (
          filtered.map(alert => {
            const isHigh = alert.severity.toLowerCase() === 'high';
            const isAck = alert.acknowledged;

            return (
              <div
                key={alert.id}
                className={`p-6 rounded-2xl border transition-all ${
                  isAck
                    ? 'bg-slate-950/40 border-slate-800 opacity-60'
                    : isHigh
                    ? 'bg-red-950/20 border-red-500/50 shadow-lg shadow-red-950/30'
                    : 'bg-slate-900 border-amber-500/40'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${isHigh ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-base text-white">{alert.title}</h3>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                          isHigh ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {alert.severity} Severity
                        </span>
                        {alert.metric_value && (
                          <span className="text-xs font-mono font-bold text-amber-300 bg-slate-800 px-2 py-0.5 rounded">
                            {alert.metric_value}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-2 max-w-3xl leading-relaxed">{alert.message}</p>
                      <p className="text-[11px] text-slate-500 mt-2">
                        Patient: <span className="text-slate-300 font-bold">{alert.patient_name || alert.patient_id}</span> ({alert.patient_region || "NER Region"}) • Time: {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Acknowledge Button */}
                  <div>
                    {isAck ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-800">
                        <Check className="w-4 h-4" /> Acknowledged
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold rounded-xl border border-teal-400 flex items-center gap-2 shadow-md cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Acknowledge & Sign</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
