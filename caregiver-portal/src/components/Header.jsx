import React from 'react';
import { Activity, Bell, ShieldCheck, UserCheck } from 'lucide-react';

export default function Header({ activeAlertCount = 0 }) {
  return (
    <header className="h-20 bg-slate-900 border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-30 shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center text-white shadow-teal-500/20 shadow-lg">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white leading-tight">PS 26003 Clinician & Caregiver Portal</h1>
          <p className="text-xs text-teal-400 font-semibold tracking-wider">NER COGNITIVE HEALTH ECOSYSTEM</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* DPDP Act 2023 Statutory Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-950/60 border border-teal-800/80 text-teal-300 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>DPDP Act 2023 & ABDM Verified</span>
        </div>

        {/* Alerts Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm">
          <Bell className="w-4 h-4 text-amber-400" />
          <span>Active Alerts:</span>
          <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${activeAlertCount > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-700 text-slate-300'}`}>
            {activeAlertCount}
          </span>
        </div>

        {/* Doctor Profile */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-sm font-semibold text-white">Dr. S. K. Barua, MD</p>
            <p className="text-xs text-slate-400">Chief Neurologist (GNRC)</p>
          </div>
        </div>
      </div>
    </header>
  );
}
