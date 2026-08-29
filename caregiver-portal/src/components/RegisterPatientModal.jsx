import React, { useState } from 'react';
import { UserPlus, X, CheckCircle, ShieldAlert } from 'lucide-react';
import { registerPatient } from '../services/api';

export default function RegisterPatientModal({ isOpen, onClose, onPatientRegistered }) {
  const [formData, setFormData] = useState({
    name: '',
    age: 72,
    gender: 'Male',
    education_years: 10,
    preferred_language: 'as',
    region: 'Assam (Guwahati)',
    dementia_stage: 'MCI',
    baseline_mmse: 24.0,
    baseline_moca: 22.0,
    caregiver_name: '',
    caregiver_relation: 'Daughter',
    caregiver_phone: '+91 98640-12345'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    setError(null);

    const newId = `p-${formData.region.substring(0, 4).toLowerCase().replace(/[^a-z]/g, '')}-${Date.now().toString().slice(-4)}`;
    const payload = {
      id: newId,
      name: formData.name.trim(),
      age: parseInt(formData.age) || 70,
      gender: formData.gender,
      education_years: parseInt(formData.education_years) || 10,
      preferred_language: formData.preferred_language,
      region: formData.region,
      dementia_stage: formData.dementia_stage,
      baseline_mmse: parseFloat(formData.baseline_mmse) || 24.0,
      baseline_moca: parseFloat(formData.baseline_moca) || 22.0,
      caregiver_name: formData.caregiver_name.trim() || 'Caregiver',
      caregiver_relation: formData.caregiver_relation,
      caregiver_phone: formData.caregiver_phone.trim() || '+91 98640-12345'
    };

    try {
      const res = await registerPatient(payload);
      if (onPatientRegistered) onPatientRegistered(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to register patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 animate-fade-in my-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/10 rounded-xl border border-teal-500/30 text-teal-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Register New Patient</h3>
              <p className="text-xs text-slate-400">Clinical Onboarding with LASI-DAD Education Calibration</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Patient Full Name:</label>
            <input
              type="text"
              required
              placeholder="e.g. Bhaben Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-medium focus:border-teal-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Age (Years):</label>
              <input
                type="number"
                min="50"
                max="100"
                required
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-medium focus:border-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Gender:</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-medium focus:border-teal-500 text-sm"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Education (Years):</label>
              <input
                type="number"
                min="0"
                max="25"
                value={formData.education_years}
                onChange={(e) => setFormData({ ...formData, education_years: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-medium focus:border-teal-500 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Preferred Regional Language:</label>
              <select
                value={formData.preferred_language}
                onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-medium focus:border-teal-500 text-sm"
              >
                <option value="as">অসমীয়া (Assamese)</option>
                <option value="bn">বাংলা (Bengali)</option>
                <option value="kha">Ka Ktien Khasi</option>
                <option value="lus">Mizo ṭawng</option>
                <option value="mni">মৈতৈলোন্ (Manipuri)</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">NER Region / Location:</label>
              <select
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-medium focus:border-teal-500 text-sm"
              >
                <option value="Assam (Guwahati)">Assam (Guwahati)</option>
                <option value="Nagaland (Kohima)">Nagaland (Kohima)</option>
                <option value="Mizoram (Aizawl)">Mizoram (Aizawl)</option>
                <option value="Meghalaya (Shillong)">Meghalaya (Shillong)</option>
                <option value="Manipur (Imphal)">Manipur (Imphal)</option>
                <option value="Tripura (Agartala)">Tripura (Agartala)</option>
                <option value="Arunachal (Itanagar)">Arunachal (Itanagar)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Clinical Dementia Stage:</label>
            <select
              value={formData.dementia_stage}
              onChange={(e) => setFormData({ ...formData, dementia_stage: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-medium focus:border-teal-500 text-sm"
            >
              <option value="MCI">MCI (Mild Cognitive Impairment)</option>
              <option value="Mild Dementia">Mild Dementia</option>
              <option value="Moderate Dementia">Moderate Dementia</option>
              <option value="Severe Dementia">Severe Dementia</option>
            </select>
          </div>

          {/* Dynamic Caregiver Section */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">Assigned Primary Caregiver</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Caregiver Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.caregiver_name}
                  onChange={(e) => setFormData({ ...formData, caregiver_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-medium focus:border-teal-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Relationship:</label>
                <select
                  value={formData.caregiver_relation}
                  onChange={(e) => setFormData({ ...formData, caregiver_relation: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-medium focus:border-teal-500 text-xs"
                >
                  <option value="Daughter">Daughter</option>
                  <option value="Son">Son</option>
                  <option value="Spouse">Spouse / Partner</option>
                  <option value="Nurse / Attendant">Nurse / Attendant</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Relative">Relative</option>
                  <option value="Clinician">Clinician</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Emergency Phone:</label>
                <input
                  type="tel"
                  value={formData.caregiver_phone}
                  onChange={(e) => setFormData({ ...formData, caregiver_phone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-medium focus:border-teal-500 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 transition-transform"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{loading ? 'Registering...' : 'Register Patient'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
