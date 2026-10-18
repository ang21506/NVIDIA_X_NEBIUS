import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Check,
  Clock,
  RefreshCw,
} from "lucide-react";
import { api, type StudyTask } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Panel, EmptyState } from "../components/ui";
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function StudyPlannerPage() {
  const { user, activeCourseId } = useAuth();
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [error, setError] = useState("");
  const [view, setView] = useState("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const [edit, setEdit] = useState<StudyTask | null>(null);
  const storageKey = `learnloop-sessions-${user?.id}`;
  const [custom, setCustom] = useState<StudyTask[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    let alive = true;
    if (!activeCourseId) return;
    api.planner
      .getPlan(activeCourseId)
      .then((p) => {
        if (alive) {
          setTasks(p.tasks);
          setError("");
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [activeCourseId, revision]);
  const saveCustom = (next: StudyTask[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setCustom(next);
      setError("");
      return true;
    } catch {
      setError(
        "Could not save personal sessions. Browser storage may be full or unavailable.",
      );
      return false;
    }
  };
  const update = async (
    task: StudyTask,
    data: { status?: string; due_date?: string; completion_evidence?: string },
  ) => {
    setError("");
    try {
      if (task.id.startsWith("local-session-")) {
        const saved = saveCustom(
          custom.map((t) =>
            t.id === task.id ? ({ ...t, ...data } as StudyTask) : t,
          ),
        );
        if (!saved) return false;
      } else await api.planner.updateTask(task.id, data);
      setRevision((n) => n + 1);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update task.");
      return false;
    }
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (edit) {
      const saved = await update(edit, {
        due_date: String(form.get("date")),
        status: "RESCHEDULED",
      });
      if (!saved) return;
    } else {
      const stamp = new Date().toISOString();
      const saved = saveCustom([
        ...custom,
        {
          id: `local-session-${crypto.randomUUID()}`,
          user_id: user?.id || "",
          course_id: activeCourseId || "",
          title: String(form.get("title")),
          description: "Your commitment, saved only in this browser.",
          due_date: String(form.get("date")),
          estimated_minutes: Number(form.get("minutes")),
          priority_score: 0,
          reason_codes: ["USER_CREATED"],
          status: "RECOMMENDED",
          created_at: stamp,
          updated_at: stamp,
        },
      ]);
      if (!saved) return;
    }
    dialog.current?.close();
  };
  const all = [
    ...tasks,
    ...custom.filter((t) => t.course_id === activeCourseId),
  ];
  const start = new Date(anchor);
  if (view === "week")
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (view === "month") start.setDate(1);
  const end = new Date(start);
  if (view === "week") end.setDate(end.getDate() + 6);
  if (view === "month") end.setMonth(end.getMonth() + 1, 0);
  const visible = all
    .filter((t) => t.due_date >= dateKey(start) && t.due_date <= dateKey(end))
    .sort(
      (a, b) =>
        a.due_date.localeCompare(b.due_date) ||
        b.priority_score - a.priority_score,
    );
  const move = (direction: number) => {
    const next = new Date(anchor);
    if (view === "month") {
      next.setDate(1);
      next.setMonth(next.getMonth() + direction);
    } else next.setDate(next.getDate() + direction * (view === "week" ? 7 : 1));
    setAnchor(next);
  };
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="MAKE TIME FOR UNDERSTANDING"
        title="A plan with a purpose."
        description="Choose your next session. See why a revision matters."
        action={
          <button
            className="button"
            disabled={!activeCourseId}
            onClick={() => {
              setEdit(null);
              dialog.current?.showModal();
            }}
          >
            <Plus size={17} />
            Add session
          </button>
        }
      />
      <div className="planner-toolbar">
        <div className="calendar-controls">
          <button
            className="icon-button"
            aria-label="Previous period"
            onClick={() => move(-1)}
          >
            <ArrowLeft size={18} />
          </button>
          <strong>
            {start.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
            {view !== "today" &&
              ` – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
          </strong>
          <button
            className="icon-button"
            aria-label="Next period"
            onClick={() => move(1)}
          >
            <ArrowRight size={18} />
          </button>
          <button className="text-link" onClick={() => setAnchor(new Date())}>
            Today
          </button>
        </div>
        <div className="tabs" role="group" aria-label="Planner view">
          {["today", "week", "month"].map((v) => (
            <button
              key={v}
              className={view === v ? "active" : ""}
              aria-pressed={view === v}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}
      <Panel
        title="Your schedule"
        action={
          <button
            className="text-link"
            disabled={busy || !activeCourseId}
            onClick={async () => {
              if (!activeCourseId) return;
              setBusy(true);
              try {
                await api.planner.recalculate(activeCourseId);
                setRevision((n) => n + 1);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not refresh.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <RefreshCw size={14} />
            {busy ? "Refreshing…" : "Refresh suggestions"}
          </button>
        }
      >
        {visible.length ? (
          visible.map((t) => (
            <article className="planner-row" key={t.id}>
              <div className="date-tile">
                <strong>{new Date(`${t.due_date}T12:00:00`).getDate()}</strong>
                <span>
                  {new Date(`${t.due_date}T12:00:00`).toLocaleDateString(
                    undefined,
                    { weekday: "short" },
                  )}
                </span>
              </div>
              <div className="task-content">
                <span className="tag">
                  {t.id.startsWith("local-session-")
                    ? "Personal · browser only"
                    : t.status === "COMPLETED"
                      ? "Completed"
                      : "Suggested revision"}
                </span>
                <h3>{t.title}</h3>
                <p>{t.description}</p>
                <small>
                  <Clock size={12} />
                  {t.estimated_minutes} minutes estimated
                </small>
              </div>
              <div className="task-actions">
                {t.status !== "COMPLETED" && (
                  <>
                    <Link className="text-link" to="/quizzes">
                      Practice
                      <ArrowRight size={14} />
                    </Link>
                    <button
                      className="icon-button"
                      aria-label={`Mark ${t.title} complete`}
                      onClick={() =>
                        update(t, {
                          status: "COMPLETED",
                          completion_evidence:
                            "Self-reported completion, not independently verified.",
                        })
                      }
                    >
                      <Check size={18} />
                    </button>
                  </>
                )}
                <button
                  className="text-link"
                  onClick={() => {
                    setEdit(t);
                    dialog.current?.showModal();
                  }}
                >
                  Reschedule
                </button>
                {t.id.startsWith("local-session-") && (
                  <button
                    className="text-link"
                    onClick={() => {
                      if (confirm("Delete this personal session?"))
                        saveCustom(custom.filter((c) => c.id !== t.id));
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </article>
          ))
        ) : (
          <EmptyState title="A little breathing room">
            No sessions in this period. Add a personal session or use practice
            to build recommendations.
          </EmptyState>
        )}
      </Panel>
      <p className="fine-print">
        Personal sessions are stored only in this browser. Marking a task
        complete is self-reported and does not prove mastery.
      </p>
      <dialog ref={dialog} className="auth-dialog">
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}
        <h2>{edit ? "Reschedule session" : "Make time to learn"}</h2>
        <form key={edit?.id || "new"} onSubmit={save}>
          {!edit && (
            <>
              <label>
                Session title
                <input
                  name="title"
                  required
                  maxLength={120}
                  placeholder="Review binary search"
                />
              </label>
              <label>
                Estimated minutes
                <input
                  name="minutes"
                  type="number"
                  min="5"
                  max="480"
                  defaultValue="25"
                  required
                />
              </label>
            </>
          )}
          <label>
            Date
            <input
              name="date"
              type="date"
              required
              defaultValue={edit?.due_date || dateKey(anchor)}
            />
          </label>
          <div className="form-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <button className="button">Save session</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
