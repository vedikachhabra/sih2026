import React from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend
} from 'recharts';

export default function CognitiveRadar({ radarDomains = [] }) {
  if (!radarDomains || radarDomains.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400">
        No radar profile data.
      </div>
    );
  }

  const chartData = radarDomains.map(d => ({
    subject: d.domain,
    PatientScore: d.score,
    AgeNorm: d.norm_baseline,
    StageBenchmark: d.stage_benchmark
  }));

  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-white">4-Domain Cognitive Radar Profile</h3>
          <p className="text-xs text-slate-400">Patient Performance vs Age-Matched Baseline (70-79 yrs)</p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#cbd5e1' }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" />
            <Radar
              name="Patient Score"
              dataKey="PatientScore"
              stroke="#2dd4bf"
              fill="#2dd4bf"
              fillOpacity={0.45}
            />
            <Radar
              name="Age-Matched Norm"
              dataKey="AgeNorm"
              stroke="#94a3b8"
              fill="#94a3b8"
              fillOpacity={0.15}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                fontSize: '0.8rem',
                color: '#f8fafc'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
