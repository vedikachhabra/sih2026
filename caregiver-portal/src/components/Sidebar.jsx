import React from 'react';
import { LayoutDashboard, Users, Bell, FileText, CalendarCheck, Radio } from 'lucide-react';

export default function Sidebar({ currentTab, setTab, alertCount = 0 }) {
  const navItems = [
    { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'patients', label: 'Patients & Trajectories', icon: Users },
    { id: 'alerts', label: 'Clinical Alerts', icon: Bell, badge: alertCount },
    { id: 'careplans', label: 'Care Plans & Meds', icon: CalendarCheck },
    { id: 'reports', label: 'PDF Clinical Reports', icon: FileText },
    { id: 'simulator', label: 'SIH Live Sync Demo', icon: Radio, highlight: true }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col p-4 flex-shrink-0">
      <div className="space-y-1.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30 shadow-sm'
                  : item.highlight
                  ? 'bg-amber-950/40 text-amber-300 border border-amber-500/30 hover:bg-amber-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-teal-400' : item.highlight ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-4 border-t border-slate-800/80">
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <p className="text-xs font-bold text-slate-300 mb-1">NER Deployment</p>
          <p className="text-xs text-slate-400">Assam • Nagaland • Mizoram • Meghalaya</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-[11px] text-emerald-300 font-medium">Backend REST API 1.0.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
