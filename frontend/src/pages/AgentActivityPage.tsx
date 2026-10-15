import React, { useState, useEffect } from 'react';
import { api, AgentRun, ToolGrant } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  RotateCcw,
  Sliders,
  Terminal,
} from 'lucide-react';

export const AgentActivityPage: React.FC = () => {
  const { activeCourseId } = useAuth();
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [grants, setGrants] = useState<ToolGrant[]>([]);
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const loadActivity = async () => {
    setLoading(true);
    try {
      const [rList, gList] = await Promise.all([
        api.agent.listRuns(activeCourseId || undefined),
        api.agent.listGrants(),
      ]);
      setRuns(rList);
      setGrants(gList);
      if (rList.length > 0 && !selectedRun) {
        setSelectedRun(rList[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivity();
  }, [activeCourseId]);

  const handleToggleGrant = async (toolName: string, currentVal: boolean) => {
    try {
      await api.agent.toggleGrant(toolName, !currentVal);
      await loadActivity();
    } catch (err: any) {
      alert(err.message || 'Failed updating grant');
    }
  };

  const handleTriggerSkill = async (skillName: string, goal: string) => {
    setTriggering(true);
    try {
      await api.agent.triggerRun({
        skill_name: skillName,
        goal,
        course_id: activeCourseId || undefined,
      });
      await loadActivity();
    } catch (err: any) {
      alert(err.message || 'Agent run failed');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" /> Agent Activity & Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Transparent execution trace with verified states and student-controlled tool grants.
          </p>
        </div>

        {/* Quick Manual Trigger Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTriggerSkill('replan_study', 'Autonomously recalculate course priorities')}
            disabled={triggering}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Test Re-Plan Skill</span>
          </button>
          <button
            onClick={() => handleTriggerSkill('daily_study_brief', 'Compile daily study brief for due topics')}
            disabled={triggering}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Test Daily Brief Skill</span>
          </button>
        </div>
      </div>

      {/* Permissions / Tool Grants Panel */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" /> Bounded Tool Permissions & Revocations
        </h2>
        <p className="text-xs text-slate-400">
          The agent cannot execute tools without your permission. Toggle any skill below to test permission enforcement.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {grants.map((g) => (
            <div
              key={g.id}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-mono font-bold text-slate-200">{g.tool_name}</span>
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{g.description}</p>
              </div>
              <button
                onClick={() => handleToggleGrant(g.tool_name, g.is_granted)}
                className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md transition-colors ${
                  g.is_granted
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {g.is_granted ? 'Granted' : 'Revoked'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Trail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Runs List (1 Col) */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider px-1">Recent Agent Runs</h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {runs.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">No agent runs recorded yet.</div>
            ) : (
              runs.map((r) => {
                const isSelected = selectedRun?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRun(r)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-cyan-500/70 shadow-md shadow-cyan-500/5'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-cyan-300 text-[11px]">{r.skill_name}</span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          r.execution_state === 'COMPLETED'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : r.execution_state === 'FAILED'
                            ? 'bg-rose-500/15 text-rose-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {r.execution_state}
                      </span>
                    </div>
                    <p className="text-slate-300 font-medium truncate">{r.goal}</p>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {new Date(r.started_at).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Run Detail & Step State Machine Trace (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5">
          {selectedRun ? (
            <>
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-cyan-400">Run ID: {selectedRun.id.slice(0, 8)}...</span>
                  <span className="text-xs font-bold text-slate-300">
                    Started: {new Date(selectedRun.started_at).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">{selectedRun.goal}</h3>
                {selectedRun.result_summary && (
                  <div className="mt-2 p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300">
                    <strong className="text-emerald-400">Verified Result:</strong> {selectedRun.result_summary}
                  </div>
                )}
                {selectedRun.error_message && (
                  <div className="mt-2 p-3 rounded-lg bg-rose-950/30 border border-rose-500/20 text-xs text-rose-300">
                    <strong className="text-rose-400">Error:</strong> {selectedRun.error_message}
                  </div>
                )}
              </div>

              {/* State Machine Visualization */}
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  State Machine Lifecycle
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {['REQUESTED', 'AUTHORIZED', 'CONTEXT_LOADED', 'PLANNED', 'TOOL_EXECUTED', 'VERIFIED', 'MEMORY_UPDATED', 'COMPLETED'].map((st) => {
                    const isReached = selectedRun.logs.some((l) => l.includes(`[${st}]`));
                    return (
                      <div
                        key={st}
                        className={`p-2 rounded-lg text-center text-[10px] font-mono font-bold border ${
                          isReached
                            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                            : 'bg-slate-950 text-slate-600 border-slate-800'
                        }`}
                      >
                        {st}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Execution Log Stream */}
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-2">
                  <Terminal className="w-3.5 h-3.5 text-slate-400" /> Sanitized Execution Logs
                </span>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1.5 max-h-60 overflow-y-auto">
                  {selectedRun.logs.map((logStr, i) => (
                    <div key={i} className="leading-relaxed">
                      {logStr}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-xs text-slate-500">
              Select an agent run to inspect its verified audit trail.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
