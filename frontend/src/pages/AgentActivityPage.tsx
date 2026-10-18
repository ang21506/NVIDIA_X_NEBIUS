import { useEffect, useState } from "react";
import { api, authStorage, type AgentRun, type ToolGrant } from "../api/client";
import { DEMO_TOKEN } from "../api/demo";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Panel, EmptyState } from "../components/ui";
export function AgentActivityPage() {
  const { activeCourseId } = useAuth();
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [grants, setGrants] = useState<ToolGrant[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const local = authStorage.getToken() === DEMO_TOKEN;
  useEffect(() => {
    let alive = true;
    Promise.all([
      api.agent.listRuns(activeCourseId || undefined),
      api.agent.listGrants(),
    ])
      .then(([r, g]) => {
        if (alive) {
          setRuns(r);
          setGrants(g);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [activeCourseId, revision]);
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="TRANSPARENT ACTIONS"
        title="What your agent is doing."
        description="Inspect the actions and permissions reported by the connected service."
      />
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      <div className="two-column">
        <Panel title="Recent runs">
          {runs.length ? (
            runs.map((r) => (
              <details className="agent-run" key={r.id}>
                <summary>
                  {r.skill_name.replaceAll("_", " ")}{" "}
                  <span className="tag">{r.execution_state}</span>
                </summary>
                <p className="body-copy">
                  {r.result_summary || r.error_message || r.goal}
                </p>
                <pre>{r.logs.join("\n")}</pre>
                <p className="fine-print">
                  State labels are reported by the backend, not independent
                  frontend verification.
                </p>
              </details>
            ))
          ) : (
            <EmptyState
              title={
                local
                  ? "No agent runs in local mode"
                  : "No recorded actions yet"
              }
            >
              {local
                ? "The sample learning loop uses a deterministic browser engine. It does not execute autonomous tools."
                : "Run a study brief to inspect the resulting action log."}
            </EmptyState>
          )}
          <button
            className="button secondary"
            disabled={busy || local || !activeCourseId}
            onClick={async () => {
              if (!activeCourseId) return;
              setBusy(true);
              try {
                await api.agent.triggerRun({
                  goal: "Summarize my current study priorities",
                  skill_name: "daily_study_brief",
                  course_id: activeCourseId,
                });
                setRevision((n) => n + 1);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Run failed.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Running…" : "Request a study brief"}
          </button>
        </Panel>
        <Panel title="Tool permissions">
          {grants.length ? (
            grants.map((g) => (
              <label className="grant-row" key={g.id}>
                <span>
                  <strong>{g.tool_name.replaceAll("_", " ")}</strong>
                  <small>{g.description}</small>
                </span>
                <input
                  type="checkbox"
                  checked={g.is_granted}
                  disabled={busy}
                  onChange={async () => {
                    setBusy(true);
                    try {
                      await api.agent.toggleGrant(g.tool_name, !g.is_granted);
                      setRevision((n) => n + 1);
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Permission update failed.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </label>
            ))
          ) : (
            <p className="body-copy">
              {local
                ? "No external tools are connected to this local demo."
                : "No permissions were returned by the service."}
            </p>
          )}
          <p className="fine-print">
            Revocation is saved through the existing API. Enforcement depends on
            the backend implementation.
          </p>
        </Panel>
      </div>
    </div>
  );
}
