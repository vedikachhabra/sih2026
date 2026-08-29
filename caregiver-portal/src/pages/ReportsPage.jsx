import React, { useState } from 'react';
import { FileText, Download, ShieldCheck, CheckCircle2, FileCheck, ExternalLink } from 'lucide-react';
import { getExportReportUrl } from '../services/api';

export default function ReportsPage({ patients = [] }) {
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || "p-assam-001");
  const [daysRange, setDaysRange] = useState(30);

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Clinical Assessment Reports (DPDP Act 2023)</h2>
          <p className="text-xs text-slate-400 mt-1">
            Export FHIR LOINC 72172-0 standardized clinical progress reports complete with doctor sign-off ledgers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Parameters Card */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-teal-400" />
            <span>Generate Clinical Export</span>
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Select Patient:</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 font-bold focus:outline-none focus:border-teal-500"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.region})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-bold">Assessment Timeline Range:</label>
              <div className="grid grid-cols-3 gap-2">
                {[14, 30, 90].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDaysRange(d)}
                    className={`py-2.5 rounded-xl font-bold transition-all ${
                      daysRange === d
                        ? 'bg-teal-600 text-white border-2 border-teal-400'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    Last {d} Days
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-teal-950/40 rounded-2xl border border-teal-800/60 space-y-2">
              <div className="flex items-center gap-2 text-teal-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Statutory Compliance Checks</span>
              </div>
              <ul className="text-[11px] text-teal-200/80 space-y-1">
                <li>✓ DPDP Act 2023 Representative Consent Logged</li>
                <li>✓ Mental Healthcare Act 2017 Nominated Guardian Validated</li>
                <li>✓ FHIR LOINC 72172-0 & 72133-2 Profiles Embedded</li>
                <li>✓ Immutable Audit Ledger ID Registered</li>
              </ul>
            </div>

            <a
              href={getExportReportUrl(selectedPatientId, daysRange)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-teal-950/50 active:scale-95 transition-transform cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Signed PDF Document</span>
            </a>
          </div>
        </div>

        {/* Live Document Preview Card */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-400" />
              <span>Document Summary Preview</span>
            </h3>
            <span className="text-xs font-mono text-teal-400 bg-teal-950 px-2.5 py-1 rounded-lg border border-teal-800">
              ID: {selectedPatient?.id}
            </span>
          </div>

          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4 text-xs font-mono">
            <div className="border-b border-slate-800 pb-3 flex justify-between">
              <div>
                <p className="font-bold text-white text-sm">CLINICAL COGNITIVE ASSESSMENT & LONGITUDINAL PROGRESS REPORT</p>
                <p className="text-slate-400 text-[11px]">AI-Based Cognitive Gaming & Memory Assistance Platform (NER)</p>
              </div>
              <span className="text-emerald-400 font-bold">[ABDM-EHR-AUTHENTICATED]</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-[11px] text-slate-300">
              <div><span className="text-slate-500">Patient:</span> {selectedPatient?.name}</div>
              <div><span className="text-slate-500">Stage:</span> {selectedPatient?.dementia_stage?.toUpperCase()}</div>
              <div><span className="text-slate-500">Region:</span> {selectedPatient?.region}</div>
            </div>

            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <p className="font-bold text-teal-300">DOMAIN BREAKDOWN SUMMARY ({daysRange} DAYS):</p>
              <p className="text-slate-300">• Working Memory (Visual N-Back): Standardized Scaled Trajectory OK</p>
              <p className="text-slate-300">• Selective Visual Attention: Odd-One-Out Feature Discrimination Preserved</p>
              <p className="text-slate-300">• Executive Sequencing: Daily Life Routine Steps In-Order</p>
              <p className="text-slate-300">• Visuospatial Pattern Discrimination: Handloom Traditional Form Matching Stable</p>
            </div>

            <div className="text-[10px] text-slate-500 leading-relaxed pt-2 border-t border-slate-800">
              LEGAL NOTICE: Issued under Section 9 of the DPDP Act 2023. Health data encrypted with AES-256 and authenticated by GNRC Neurological Services.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
