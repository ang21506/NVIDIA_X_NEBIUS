import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Download,
  Trash2,
  RotateCcw,
  User,
  Clock,
  Cpu,
  Lock,
  CheckCircle2,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [privacyInfo, setPrivacyInfo] = useState<any>(null);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    api.settings.getPrivacy().then(setPrivacyInfo).catch(console.error);
    if (user) {
      setFullName(user.full_name);
      setTimezone(user.timezone);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.auth.updateProfile({ full_name: fullName, timezone });
      await refreshUser();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Profile update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await api.settings.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `learnloop_learner_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setActionMessage('Learner profile and misconceptions exported as JSON.');
    } catch (err: any) {
      alert(err.message || 'Export failed');
    }
  };

  const handlePurgeData = async () => {
    if (!confirm('Are you sure you want to purge all your misconceptions, quiz scores, and learning memory? Course enrollment will be kept.')) return;
    try {
      const res = await api.settings.deleteData();
      setActionMessage(res.message);
    } catch (err: any) {
      alert(err.message || 'Purge failed');
    }
  };

  const handleResetDemo = async () => {
    if (!confirm('Reset sample demonstration course, lecture notes, and baseline quiz questions?')) return;
    try {
      const res = await api.settings.resetDemo();
      setActionMessage(res.message);
    } catch (err: any) {
      alert(err.message || 'Reset failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-cyan-400" /> Settings & Student Privacy Controls
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Control your learner profile, inspect external AI disclosures, export personal memory, or purge learning data.
        </p>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Profile Form */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-cyan-400" /> Student Profile & Timezone
        </h2>

        <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Timezone</label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            {saveSuccess && (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Model Processing Disclosure */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" /> AI Model & Inference Disclosure
        </h2>
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-3">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">Model Provider:</span>
            <span className="font-mono font-bold text-cyan-300">
              {privacyInfo?.model_provider || 'NVIDIA Nemotron via Nebius Token Factory'}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">Model Identifier:</span>
            <span className="font-mono font-bold text-slate-200">
              {privacyInfo?.model_id || 'nvidia/nemotron-3-nano-30b-a3b'}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-800/80 text-slate-300 leading-relaxed">
            {privacyInfo?.disclosure}
          </div>
        </div>
      </div>

      {/* Data Management & Actions */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-cyan-400" /> Data Ownership & Retention
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Export */}
          <button
            onClick={handleExportData}
            className="p-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-colors cursor-pointer space-y-1"
          >
            <Download className="w-4 h-4 text-cyan-400 mb-1" />
            <div className="text-xs font-bold text-white">Export Learning Memory</div>
            <p className="text-[10px] text-slate-400">Download complete structured JSON of your courses, misconceptions, and logs.</p>
          </button>

          {/* Reset Demo */}
          <button
            onClick={handleResetDemo}
            className="p-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-colors cursor-pointer space-y-1"
          >
            <RotateCcw className="w-4 h-4 text-amber-400 mb-1" />
            <div className="text-xs font-bold text-white">Reset Judge Baseline</div>
            <p className="text-[10px] text-slate-400">Restore the initial Machine Learning Fundamentals test scenario.</p>
          </button>

          {/* Purge */}
          <button
            onClick={handlePurgeData}
            className="p-4 rounded-xl bg-slate-950 hover:bg-rose-950/20 border border-slate-800 hover:border-rose-500/30 text-left transition-colors cursor-pointer space-y-1"
          >
            <Trash2 className="w-4 h-4 text-rose-400 mb-1" />
            <div className="text-xs font-bold text-rose-400">Purge Learner Memory</div>
            <p className="text-[10px] text-slate-400">Immediately wipe all misconceptions, quizzes, and study tasks.</p>
          </button>
        </div>
      </div>
    </div>
  );
};
