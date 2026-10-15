import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, Course, MemorySummary, StudyTask } from '../api/client';
import {
  Sparkles,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  BrainCircuit,
  ArrowRight,
  TrendingUp,
  FolderArchive,
  RefreshCw,
  Zap,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, activeCourseId } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [memorySummary, setMemorySummary] = useState<MemorySummary | null>(null);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const courses = await api.courses.list();
      const current = courses.find((c) => c.id === activeCourseId) || courses[0] || null;
      setCourse(current);

      if (current) {
        const [mem, plan] = await Promise.all([
          api.memory.getSummary(current.id),
          api.planner.getPlan(current.id),
        ]);
        setMemorySummary(mem);
        setTasks(plan.tasks);
      }
    } catch (err) {
      console.error('Failed loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [activeCourseId]);

  // Exam Countdown
  const daysUntilExam = course?.exam_date
    ? Math.max(0, Math.ceil((new Date(course.exam_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const topTask = tasks.find((t) => t.status !== 'COMPLETED') || tasks[0];
  const openMisconceptions = memorySummary?.misconceptions.filter((m) => m.status !== 'RESOLVED') || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Welcome & Exam Countdown Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 mb-1 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" /> Learner Cockpit
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Course focus: <strong className="text-slate-200">{course?.title || 'No course selected'}</strong>
          </p>
        </div>

        {daysUntilExam !== null && (
          <div className="flex items-center gap-4 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg border border-cyan-500/20">
              {daysUntilExam}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">Days to Exam</div>
              <div className="text-[10px] text-slate-400 font-mono">
                {course?.exam_date ? new Date(course.exam_date).toLocaleDateString() : 'Unscheduled'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Mastery */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800/80 glass-panel-hover">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Overall Topic Mastery</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {memorySummary ? `${Math.round(memorySummary.average_mastery * 100)}%` : '--'}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${(memorySummary?.average_mastery || 0) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Open Misconceptions */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800/80 glass-panel-hover">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Misconception Memory</span>
            <BrainCircuit className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white flex items-baseline gap-2">
            <span>{openMisconceptions.length}</span>
            <span className="text-xs font-normal text-slate-400">active gaps</span>
          </div>
          <div className="text-[11px] text-amber-400/90 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            {openMisconceptions.length > 0 ? 'Retest recommended' : 'No active misconceptions'}
          </div>
        </div>

        {/* Due Tasks */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800/80 glass-panel-hover">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Tasks Scheduled</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {tasks.filter((t) => t.status !== 'COMPLETED').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            {tasks.filter((t) => t.status === 'COMPLETED').length} completed via verified events
          </div>
        </div>

        {/* Indexed Resources */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800/80 glass-panel-hover">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Course Documents</span>
            <FolderArchive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {course?.resource_count || 0}
          </div>
          <div className="text-[11px] text-emerald-400/90 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Vector indexed & grounded
          </div>
        </div>
      </div>

      {/* Main Grid: Priority Action + Misconception Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommended Next Action Card (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/70 border border-cyan-500/30 glass-panel relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase font-bold tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Prioritized Next Action
            </span>
            {topTask && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
                Priority Score: {(topTask.priority_score * 100).toFixed(0)}/100
              </span>
            )}
          </div>

          {topTask ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-white">{topTask.title}</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{topTask.description}</p>
              </div>

              {/* Reason Codes Breakdown */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Why recommended:</span>
                {topTask.reason_codes.map((code) => (
                  <span
                    key={code}
                    className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 border border-slate-700"
                  >
                    {code.replace('_', ' ')}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => navigate('/quizzes')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer shadow-md shadow-cyan-600/20"
                >
                  <span>Execute Diagnostic Quiz</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => navigate('/tutor')}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                >
                  Consult AI Tutor
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              No tasks currently pending. Click below to recalculate.
            </div>
          )}
        </div>

        {/* Misconception Memory Box (1 Col) */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-cyan-400" /> Active Misconceptions
              </h3>
              <button
                onClick={() => navigate('/memory')}
                className="text-xs text-cyan-400 hover:underline font-semibold"
              >
                View Memory →
              </button>
            </div>

            {openMisconceptions.length > 0 ? (
              <div className="space-y-3">
                {openMisconceptions.slice(0, 2).map((m) => (
                  <div key={m.id} className="p-3 rounded-xl bg-slate-950 border border-amber-500/20 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold uppercase">
                      <span>{m.status.replace('_', ' ')}</span>
                      <span>Attempt #{m.attempt_count}</span>
                    </div>
                    <p className="font-semibold text-slate-200 leading-snug">{m.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      Evidence: {m.evidence_answer}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                No uncorrected conceptual misconceptions recorded.
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/quizzes')}
            className="w-full mt-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Launch Targeted Re-Test
          </button>
        </div>
      </div>

      {/* Topics Needing Attention */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
        <h3 className="text-sm font-bold text-white mb-4">Topic Mastery Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {memorySummary?.topic_masteries.map((tm) => (
            <div key={tm.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 truncate pr-2">{tm.topic_title}</span>
                <span className={`font-mono text-xs font-bold ${tm.mastery_score >= 0.7 ? 'text-emerald-400' : tm.mastery_score >= 0.5 ? 'text-cyan-400' : 'text-amber-400'}`}>
                  {Math.round(tm.mastery_score * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${tm.mastery_score >= 0.7 ? 'bg-emerald-500' : tm.mastery_score >= 0.5 ? 'bg-cyan-500' : 'bg-amber-500'}`}
                  style={{ width: `${tm.mastery_score * 100}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>{tm.evidence_count} assessment points</span>
                <span>Confidence: {Math.round(tm.confidence_score * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
