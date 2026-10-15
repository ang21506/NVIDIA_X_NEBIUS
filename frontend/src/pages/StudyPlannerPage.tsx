import React, { useState, useEffect } from 'react';
import { api, StudyPlan, StudyTask } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  CalendarCheck2,
  RefreshCw,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowUpDown,
} from 'lucide-react';

export const StudyPlannerPage: React.FC = () => {
  const { activeCourseId } = useAuth();
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const loadPlan = async () => {
    if (!activeCourseId) return;
    setLoading(true);
    try {
      const data = await api.planner.getPlan(activeCourseId);
      setPlan(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, [activeCourseId]);

  const handleRecalculate = async () => {
    if (!activeCourseId) return;
    setRecalculating(true);
    try {
      const updated = await api.planner.recalculate(activeCourseId);
      setPlan(updated);
    } catch (err: any) {
      alert(err.message || 'Recalculation failed');
    } finally {
      setRecalculating(false);
    }
  };

  const handleCompleteTask = async (task: StudyTask) => {
    const evidence = prompt('Enter observable evidence of completion (e.g., "Read Lecture 4 Section 2 and solved problem set 3"):');
    if (!evidence) return;

    try {
      await api.planner.updateTask(task.id, {
        status: 'COMPLETED',
        completion_evidence: evidence,
      });
      await loadPlan();
    } catch (err: any) {
      alert(err.message || 'Failed updating task');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarCheck2 className="w-6 h-6 text-cyan-400" /> Autonomous Study Planner
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dynamically schedules and re-ranks study tasks based on real-time mastery deficit, exam proximity, and forgetting risk.
          </p>
        </div>

        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer shadow-md shadow-cyan-600/20"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
          <span>{recalculating ? 'Recalculating...' : 'Recalculate Priorities'}</span>
        </button>
      </div>

      {/* Formula Explanation Card */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
        <div className="text-slate-300 font-semibold flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span>Priority Algorithm:</span>
        </div>
        <p className="font-mono text-[11px] text-cyan-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
          Priority = 0.35 × (1 − Topic Mastery) + 0.25 × Exam Urgency + 0.20 × Forgetting Risk + 0.20 × Prerequisite Impact
        </p>
        <p className="text-[11px] text-slate-400">
          Normalized strictly to [0.0, 1.0]. Recalculated autonomously upon quiz submission, error detection, or exam updates.
        </p>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">Loading study schedule...</div>
        ) : plan?.tasks.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            No study tasks generated yet. Recalculate above to initialize.
          </div>
        ) : (
          plan?.tasks.map((task, idx) => {
            const isCompleted = task.status === 'COMPLETED';
            return (
              <div
                key={task.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isCompleted
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-70'
                    : 'bg-slate-900/80 border-slate-800 glass-panel-hover'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                      Rank #{idx + 1} • Priority: {task.priority_score.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400">
                      Due: <strong className="text-slate-200">{new Date(task.due_date).toLocaleDateString()}</strong>
                    </span>
                    <span className="text-xs text-slate-400">• {task.estimated_minutes} mins</span>
                  </div>

                  <h3 className={`text-base font-bold ${isCompleted ? 'line-through text-slate-400' : 'text-white'}`}>
                    {task.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{task.description}</p>

                  {/* Reason Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Triggers:</span>
                    {task.reason_codes.map((code) => (
                      <span
                        key={code}
                        className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700"
                      >
                        {code.replace('_', ' ')}
                      </span>
                    ))}
                  </div>

                  {task.completion_evidence && (
                    <div className="text-[11px] text-emerald-400 flex items-center gap-1 pt-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Evidence: "{task.completion_evidence}"</span>
                    </div>
                  )}
                </div>

                <div className="shrink-0 sm:self-center">
                  {!isCompleted ? (
                    <button
                      onClick={() => handleCompleteTask(task)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-emerald-600/30 hover:border-emerald-500/40 text-slate-200 hover:text-emerald-300 border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify Complete</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
