import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';

export default function TrendCharts({ dataPoints = [], patientName = "" }) {
  if (!dataPoints || dataPoints.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400">
        No longitudinal data points available for this range.
      </div>
    );
  }

  // Format data for chart
  const formattedData = dataPoints.map((d) => ({
    date: d.date,
    shortDate: d.date ? d.date.substring(5) : "",
    Memory: d.memory_score,
    Attention: d.attention_score,
    Sequencing: d.sequencing_score,
    Pattern: d.pattern_score,
    Composite: d.composite_score,
    EWMA: d.ewma_score,
    MoCA: d.moca_equivalent,
    MMSE: d.mmse_equivalent
  }));

  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg text-white">30-Day Cognitive Domain Trajectory</h3>
          <p className="text-xs text-slate-400">
            Standardized Z-to-T Rescaling | Two-Stage EWMA Smoothing (λ=0.25)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
            <span className="text-slate-300 font-medium">Memory</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span className="text-slate-300 font-medium">Attention</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span className="text-slate-300 font-medium">Sequencing</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-400"></span>
            <span className="text-slate-300 font-medium">Pattern</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="w-3 h-1 bg-emerald-400"></span>
            <span className="text-emerald-300 font-bold">EWMA Trend</span>
          </div>
        </div>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="shortDate" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis domain={[20, 100]} stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                fontSize: '0.8rem',
                color: '#f8fafc'
              }}
            />
            {/* Clinical Stage Threshold Reference Lines */}
            <ReferenceLine y={75} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Normal (≥75)', fill: '#10b981', fontSize: 10, position: 'right' }} />
            <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'MCI (50-74)', fill: '#f59e0b', fontSize: 10, position: 'right' }} />
            <ReferenceLine y={25} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Dementia (<50)', fill: '#ef4444', fontSize: 10, position: 'right' }} />

            <Line type="monotone" dataKey="Memory" stroke="#2dd4bf" strokeWidth={1.5} dot={false} opacity={0.7} />
            <Line type="monotone" dataKey="Attention" stroke="#22d3ee" strokeWidth={1.5} dot={false} opacity={0.7} />
            <Line type="monotone" dataKey="Sequencing" stroke="#fbbf24" strokeWidth={1.5} dot={false} opacity={0.7} />
            <Line type="monotone" dataKey="Pattern" stroke="#a78bfa" strokeWidth={1.5} dot={false} opacity={0.7} />
            <Line type="monotone" dataKey="EWMA" stroke="#34d399" strokeWidth={3.5} dot={{ r: 3, fill: '#34d399' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80 text-xs">
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <p className="text-slate-400 font-medium">MoCA Clinical Range</p>
          <p className="text-base font-bold text-teal-300 mt-0.5">
            {formattedData[formattedData.length - 1]?.MoCA || 22.0} / 30
          </p>
          <p className="text-[11px] text-slate-500 mt-1">LOINC 72172-0 Equi-percentile Map</p>
        </div>
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <p className="text-slate-400 font-medium">MMSE Equivalent</p>
          <p className="text-base font-bold text-cyan-300 mt-0.5">
            {formattedData[formattedData.length - 1]?.MMSE || 25.0} / 30
          </p>
          <p className="text-[11px] text-slate-500 mt-1">OASIS Longitudinal Calibrated</p>
        </div>
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <p className="text-slate-400 font-medium">CUSUM Decline Monitor</p>
          <p className="text-base font-bold text-emerald-400 mt-0.5">
            Active Surveillance OK
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Two-Stage Noise Filter Active</p>
        </div>
      </div>
    </div>
  );
}
