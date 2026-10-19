import { useEffect, useState } from "react";
import {
  api,
  authStorage,
  type MasteryItem,
  type StudyTask,
  type QuizAttemptItem,
} from "../api/client";
import { DEMO_TOKEN, readDemo } from "../api/demo";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Panel, EmptyState, Progress } from "../components/ui";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
export function AnalyticsPage() {
  const { activeCourseId } = useAuth();
  const [data, setData] = useState<{
    mastery: MasteryItem[];
    tasks: StudyTask[];
  } | null>(null);
  const [attempts, setAttempts] = useState<QuizAttemptItem[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    if (!activeCourseId) return;
    Promise.all([
      api.memory.getMastery(activeCourseId),
      api.planner.getPlan(activeCourseId),
      api.quizzes.listAttempts(activeCourseId).catch(() => []),
    ])
      .then(([mastery, plan, quizAttempts]) => {
        if (!alive) return;
        setData({ mastery, tasks: plan.tasks });
        if (quizAttempts && quizAttempts.length > 0) {
          setAttempts(quizAttempts);
        } else if (authStorage.getToken() === DEMO_TOKEN) {
          setAttempts(
            readDemo()
              .attempts.filter((a) => a.course_id === activeCourseId)
              .map((a) => ({
                id: a.attempt_id,
                course_id: a.course_id,
                total_items: a.total_items,
                correct_items: a.correct_items,
                score_percentage: a.score_percentage,
                created_at: a.created_at,
              })),
          );
        } else {
          setAttempts([]);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [activeCourseId]);

  const chart = attempts.map((a, i) => ({
    session: `#${i + 1}`,
    accuracy: Math.round(a.score_percentage),
  }));
  const total = data?.mastery.reduce((n, m) => n + m.total_count, 0) || 0;
  const correct = data?.mastery.reduce((n, m) => n + m.correct_count, 0) || 0;
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="PROGRESS, WITH CONTEXT"
        title="Your learning, in perspective."
        description="Evidence from your practice. Small steps you can actually see."
      />
      {error && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}
      <div className="metric-grid">
        {[
          ["Questions answered", total],
          [
            "Practice accuracy",
            total ? `${Math.round((correct / total) * 100)}%` : "—",
          ],
          [
            "Completed tasks",
            data?.tasks.filter((t) => t.status === "COMPLETED").length || 0,
          ],
          [
            "Topics with evidence",
            data?.mastery.filter((m) => m.evidence_count > 0).length || 0,
          ],
        ].map(([label, value]) => (
          <div className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="two-column">
        <Panel title="Topic mastery">
          {data?.mastery.length ? (
            data.mastery.map((m) => (
              <div className="mastery-row" key={m.id}>
                <div>
                  <strong>{m.topic_title}</strong>
                  <span>{Math.round(m.mastery_score * 100)}%</span>
                </div>
                <Progress value={m.mastery_score * 100} label={m.topic_title} />
                <small>
                  {m.evidence_count} answer{m.evidence_count === 1 ? "" : "s"}{" "}
                  as evidence
                </small>
              </div>
            ))
          ) : (
            <EmptyState
              title="A fresh start"
              to="/quizzes"
              label="Start practice"
            >
              Your topics will appear after a course is ready.
            </EmptyState>
          )}
          <p className="fine-print">
            Mastery is a heuristic, not a grade. A medium answer changes the
            estimate by +0.15 when correct or −0.20 when incorrect, bounded from
            0 to 1.
          </p>
        </Panel>
        <Panel title="Practice accuracy by session">
          {chart.length ? (
            <>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chart}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="session" stroke="var(--muted)" />
                    <YAxis domain={[0, 100]} unit="%" stroke="var(--muted)" />
                    <Tooltip
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
                    />
                    <Bar
                      dataKey="accuracy"
                      fill="var(--teal)"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="fine-print">
                {attempts
                  .map(
                    (a, i) =>
                      `Session ${i + 1}: ${a.correct_items}/${a.total_items} correct (${a.score_percentage}%)`,
                  )
                  .join(" · ")}
              </p>
            </>
          ) : (
            <EmptyState
              title="Your progress starts with practice"
              to="/quizzes"
              label="Open practice"
            >
              Complete your first practice quiz to see your session-by-session accuracy trend.
            </EmptyState>
          )}
        </Panel>
      </div>
      <Panel title="A note about study time">
        <p className="body-copy">
          Task durations are estimates, not tracked learning time. This
          interface does not report study hours until an activity-tracking
          source is available.
        </p>
      </Panel>
    </div>
  );
}
