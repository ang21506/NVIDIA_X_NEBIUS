import React, { useState, useEffect } from 'react';
import { api, Misconception, MasteryItem } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  BrainCircuit,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertTriangle,
  History,
  TrendingUp,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export const LearningMemoryPage: React.FC = () => {
  const { activeCourseId } = useAuth();
  const [misconceptions, setMisconceptions] = useState<Misconception[]>([]);
  const [masteries, setMasteries] = useState<MasteryItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [loading, setLoading] = useState(true);

  const loadMemory = async () => {
    setLoading(true);
    try {
      const [miscList, mastList] = await Promise.all([
        api.memory.getMisconceptions(activeCourseId || undefined),
        api.memory.getMastery(activeCourseId || undefined),
      ]);
      setMisconceptions(miscList);
      setMasteries(mastList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemory();
  }, [activeCourseId]);

  const filteredMisconceptions = misconceptions.filter((m) => {
    if (filter === 'open') return m.status !== 'RESOLVED';
    if (filter === 'resolved') return m.status === 'RESOLVED';
    return true;
  });

  const openCount = misconceptions.filter((m) => m.status !== 'RESOLVED').length;
  const resolvedCount = misconceptions.filter((m) => m.status === 'RESOLVED').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-cyan-400" /> Misconception Memory & Learner Model
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Persists exact conceptual misunderstandings, evidence, interventions, and verified resolutions across sessions.
          </p>
        </div>

        {/* Filter Toggle */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filter === 'all' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({misconceptions.length})
          </button>
          <button
            onClick={() => setFilter('open')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filter === 'open' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Needs Retest ({openCount})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filter === 'resolved' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Misconception Memory Cards */}
      <div className="space-y-4">
        {filteredMisconceptions.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs">
            No misconceptions found matching this filter. Take a diagnostic quiz to identify gaps.
          </div>
        ) : (
          filteredMisconceptions.map((m) => {
            const isResolved = m.status === 'RESOLVED';
            return (
              <div
                key={m.id}
                className={`p-6 rounded-2xl border transition-all ${
                  isResolved
                    ? 'bg-slate-900/50 border-emerald-500/30'
                    : 'bg-slate-900/80 border-amber-500/30 shadow-lg shadow-amber-500/5'
                }`}
              >
                {/* Header status bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                        isResolved
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {m.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Topic: <strong className="text-slate-200">{m.topic_title}</strong>
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    <span>Attempts: {m.attempt_count}</span>
                    <span>•</span>
                    <span>Confidence: {Math.round(m.confidence * 100)}%</span>
                    {m.next_review_at && !isResolved && (
                      <>
                        <span>•</span>
                        <span className="text-cyan-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Review: {new Date(m.next_review_at).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="mt-4 space-y-3">
                  <h3 className="text-base font-bold text-white">{m.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{m.description}</p>

                  {/* Supporting Assessment Evidence */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1.5">
                    <div className="text-[10px] font-bold uppercase text-slate-400">
                      Assessment Evidence:
                    </div>
                    <p className="text-slate-300 font-medium">Question: "{m.evidence_question}"</p>
                    <p className="text-rose-400">Recorded Answer: "{m.evidence_answer}"</p>
                    <p className="text-emerald-400 font-semibold">Expected Reasoning: "{m.expected_concept}"</p>
                  </div>

                  {/* Remediation Walkthrough */}
                  {m.remediation_provided && (
                    <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs space-y-1">
                      <div className="text-[10px] font-bold uppercase text-cyan-400 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> Remediation Provided:
                      </div>
                      <p className="text-slate-200 leading-relaxed">{m.remediation_provided}</p>
                    </div>
                  )}

                  {/* Resolution Footnote */}
                  {isResolved ? (
                    <div className="pt-2 text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Verified resolved on {m.resolved_at ? new Date(m.resolved_at).toLocaleDateString() : 'recent re-test'}.
                      </span>
                    </div>
                  ) : (
                    <div className="pt-2 text-xs text-amber-400/90 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Resolution rule requires a successful follow-up assessment on this concept.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Semantic Topic Mastery Grid */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" /> Topic Mastery & Confidence States
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {masteries.map((mast) => (
            <div key={mast.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 truncate">{mast.topic_title}</span>
                <span className="font-mono font-bold text-cyan-400">
                  {Math.round(mast.mastery_score * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-500 h-full rounded-full transition-all"
                  style={{ width: `${mast.mastery_score * 100}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>{mast.correct_count}/{mast.total_count} Correct</span>
                <span>Confidence: {Math.round(mast.confidence_score * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
