import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  BrainCircuit,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  api,
  type Course,
  type MemorySummary,
  type StudyTask,
} from "../api/client";
import { PageHeader, Panel, EmptyState, Progress } from "../components/ui";
import { CourseCarousel } from "../components/LearningMotion";
export function DashboardPage() {
  const { user, activeCourseId } = useAuth();
  const [data, setData] = useState<{
    courses: Course[];
    memory: MemorySummary | null;
    tasks: StudyTask[];
  } | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [hour] = useState(() => new Date().getHours());
  useEffect(() => {
    let alive = true;
    (async () => {
      const courses = await api.courses.list();
      const id = activeCourseId || courses[0]?.id;
      const [memory, plan] = id
        ? await Promise.all([
            api.memory.getSummary(id),
            api.planner.getPlan(id),
          ])
        : [null, null];
      if (alive) {
        setData({ courses, memory, tasks: plan?.tasks || [] });
        setError("");
      }
    })().catch((e) => {
      if (alive) setError(e.message);
    });
    return () => {
      alive = false;
    };
  }, [activeCourseId, retry]);
  if (error)
    return (
      <EmptyState title="Your workspace could not load">
        {error}
        <button className="button" onClick={() => setRetry((n) => n + 1)}>
          Try again
        </button>
      </EmptyState>
    );
  if (!data)
    return (
      <div className="loading-state" role="status">
        Loading your learning workspace…
      </div>
    );
  const { courses, memory, tasks } = data;
  const course = courses.find((c) => c.id === activeCourseId) || courses[0];
  const pending = tasks.filter((t) => t.status !== "COMPLETED");
  const completed = tasks.length - pending.length;
  const weak = [...(memory?.topic_masteries || [])]
    .sort((a, b) => a.mastery_score - b.mastery_score)
    .slice(0, 3);
  return (
    <div className="dashboard page-stack">
      <PageHeader
        eyebrow="A LITTLE PROGRESS, EVERY DAY"
        title={`Good ${hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}, ${user?.full_name?.split(" ")[0] || "learner"}.`}
        description="A clear next step. A little more understanding."
        action={
          <Link className="button secondary" to="/planner">
            <CalendarDays size={17} />
            View study plan
          </Link>
        }
      />
      <div className="metric-grid">
        {[
          {
            icon: BookOpen,
            label: "Active courses",
            value: courses.length,
            note: "In your workspace",
          },
          {
            icon: CheckCircle2,
            label: "Topics assessed",
            value:
              memory?.topic_masteries.filter((m) => m.evidence_count > 0)
                .length || 0,
            note: "With practice evidence",
          },
          {
            icon: BrainCircuit,
            label: "Open learning gaps",
            value: memory?.open_misconceptions_count || 0,
            note: "Ready for another look",
          },
          {
            icon: Clock,
            label: "Tasks completed",
            value: completed,
            note: "In the selected course",
          },
        ].map((m) => (
          <div className="metric-card" key={m.label}>
            <span className="metric-icon">
              <m.icon size={19} />
            </span>
            <span className="metric-label">{m.label}</span>
            <strong>{m.value}</strong>
            <small>{m.note}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <Panel
          title="Today's study plan"
          action={
            <Link className="text-link" to="/planner">
              View all <ArrowRight size={14} />
            </Link>
          }
          className="study-panel"
        >
          <div className="plan-summary">
            <span>
              {completed} of {tasks.length} tasks complete
            </span>
            <Progress
              value={(completed / (tasks.length || 1)) * 100}
              label="Tasks completed"
            />
          </div>
          {pending.length ? (
            pending.slice(0, 4).map((t, i) => (
              <div className="study-row" key={t.id}>
                <span className="task-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <strong>{t.title}</strong>
                  <small>
                    {t.estimated_minutes} min ·{" "}
                    {t.reason_codes.includes("RECENT_ERROR")
                      ? "Recommended after practice"
                      : "Suggested practice"}
                  </small>
                </div>
                <Link
                  aria-label={`Start ${t.title}`}
                  className="icon-button"
                  to="/quizzes"
                >
                  <ArrowRight size={18} />
                </Link>
              </div>
            ))
          ) : (
            <EmptyState
              title="A little room to learn"
              to="/courses"
              label="Explore courses"
            >
              Add a course or start practice to build your next study plan.
            </EmptyState>
          )}
          <Link className="button full" to="/quizzes">
            Start a focused session <ArrowRight size={17} />
          </Link>
        </Panel>
        <div className="page-stack">
          <section className="focus-card">
            <img
              className="focus-art"
              src="/images/study-sanctuary.png"
              alt="A reading lamp illuminating an open book and miniature garden"
              width="1254"
              height="1254"
            />
            <span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span>
            <span className="course-code">
              {course?.code || "YOUR NEXT CHAPTER"}
            </span>
            <h2>{course?.title || "Make space for your next idea."}</h2>
            <p>
              {pending[0]?.topic_title ||
                "Choose a course, add your materials, and take the first step."}
            </p>
            <Link className="button" to={course ? "/courses" : "/onboarding"}>
              Continue learning <ArrowRight size={17} />
            </Link>
          </section>
          <Panel title="Areas to revisit">
            {weak.length ? (
              weak.map((m) => (
                <Link className="mastery-row" to="/quizzes" key={m.id}>
                  <div>
                    <strong>{m.topic_title}</strong>
                    <span>
                      {m.evidence_count
                        ? `${Math.round(m.mastery_score * 100)}% estimate`
                        : "Not assessed"}
                    </span>
                  </div>
                  <Progress
                    value={m.mastery_score * 100}
                    label={m.topic_title}
                  />
                </Link>
              ))
            ) : (
              <EmptyState title="Your understanding, made visible">
                Complete practice to see topic-level evidence here.
              </EmptyState>
            )}
          </Panel>
        </div>
        <div className="page-stack">
          <Panel title="Why this next step?">
            <span className="insight-icon">
              <BrainCircuit size={24} />
            </span>
            <h3>
              {memory?.open_misconceptions_count
                ? "Turn a mistake into understanding."
                : "Start with what you know."}
            </h3>
            <p className="body-copy">
              {pending[0]?.description ||
                "Your recommendations will appear as you build your learning history."}
            </p>
            <Link className="text-link" to="/memory">
              Explore learning memory <ArrowRight size={15} />
            </Link>
          </Panel>
          <Panel title="Upcoming exam">
            {course?.exam_date ? (
              <>
                <strong className="exam-date">
                  {new Date(`${course.exam_date}T12:00:00`).toLocaleDateString(
                    undefined,
                    { day: "numeric", month: "short" },
                  )}
                </strong>
                <p>{course.title}</p>
              </>
            ) : (
              <>
                <p className="body-copy">
                  No exam date set. Add one to your course to give your study
                  plan a deadline.
                </p>
                <Link className="text-link" to="/courses">
                  Open courses <ArrowRight size={15} />
                </Link>
              </>
            )}
          </Panel>
        </div>
      </div>
      <CourseCarousel courses={courses} />
      <div className="dashboard-footer">
        <span>
          <span className="status-dot" /> Learning is a loop, not a finish line.
        </span>
        <Link to="/analytics">
          See the evidence behind your progress <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
