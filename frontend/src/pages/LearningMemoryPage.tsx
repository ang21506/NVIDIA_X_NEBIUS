import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BrainCircuit } from "lucide-react";
import { api, type Misconception } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Panel, EmptyState } from "../components/ui";
export function LearningMemoryPage() {
  const { activeCourseId } = useAuth();
  const [memory, setMemory] = useState<Misconception[]>([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    api.memory
      .getMisconceptions(activeCourseId || undefined)
      .then((m) => {
        if (alive) setMemory(m);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [activeCourseId]);
  const selected = memory.filter(
    (m) =>
      filter === "all" ||
      (filter === "resolved"
        ? m.status === "RESOLVED"
        : m.status !== "RESOLVED"),
  );
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="PERSONALIZATION YOU CAN INSPECT"
        title="Your learning memory."
        description="Understand what you've struggled with and see how your understanding changes."
      />
      <div className="tabs" role="group" aria-label="Filter learning memory">
        {[
          ["all", "All observations"],
          ["open", "Ready to review"],
          ["resolved", "Resolved"],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={filter === value}
            className={filter === value ? "active" : ""}
            onClick={() => setFilter(value)}
          >
            {label}{" "}
            <span>
              {
                memory.filter(
                  (m) =>
                    value === "all" ||
                    (value === "resolved"
                      ? m.status === "RESOLVED"
                      : m.status !== "RESOLVED"),
                ).length
              }
            </span>
          </button>
        ))}
      </div>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      {selected.length ? (
        selected.map((m) => (
          <Panel
            key={m.id}
            title={m.topic_title || m.title}
            action={
              <span
                className={`tag ${m.status !== "RESOLVED" ? "warning" : ""}`}
              >
                {m.status === "RESOLVED" ? "Resolved" : "Ready to recheck"}
              </span>
            }
          >
            <div className="memory-detail">
              <div>
                <h3>{m.title}</h3>
                <p className="body-copy">{m.description}</p>
                <div className="evidence-box">
                  <span className="eyebrow">THE OBSERVATION</span>
                  <p>{m.evidence_question}</p>
                  <dl>
                    <dt>Your recorded answer</dt>
                    <dd>{m.evidence_answer}</dd>
                    <dt>Expected answer</dt>
                    <dd>{m.expected_concept}</dd>
                  </dl>
                </div>
              </div>
              <div className="memory-next">
                <BrainCircuit size={24} />
                <h3>A useful next step</h3>
                <p className="body-copy">
                  {m.remediation_provided ||
                    "Review the underlying concept, then try a related question."}
                </p>
                <Link className="button" to="/quizzes">
                  Practice again
                  <ArrowRight size={16} />
                </Link>
                <Link className="text-link" to="/tutor">
                  Review with JARVIS
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
            <div className="memory-timeline">
              <span>
                First observed · {new Date(m.created_at).toLocaleDateString()}
              </span>
              <span>
                Last updated · {new Date(m.updated_at).toLocaleDateString()}
              </span>
              {m.resolved_at && (
                <span>
                  Rechecked · {new Date(m.resolved_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </Panel>
        ))
      ) : (
        <Panel title="Room for new understanding">
          <EmptyState
            title="No observations in this view"
            to="/quizzes"
            label="Start practice"
          >
            Memory entries appear when an answer provides evidence of a specific
            misunderstanding. Not every incorrect answer means a misconception.
          </EmptyState>
        </Panel>
      )}
    </div>
  );
}
