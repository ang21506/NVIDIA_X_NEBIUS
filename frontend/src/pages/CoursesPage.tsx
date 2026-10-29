import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, BookOpen, Trash2 } from "lucide-react";
import { api, type Course, type CourseDetail } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Panel, EmptyState, Progress } from "../components/ui";
export function CoursesPage() {
  const { activeCourseId, setActiveCourseId } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    let alive = true;
    api.courses
      .list()
      .then(async (list) => {
        const key = list.some((c) => c.id === activeCourseId)
          ? activeCourseId
          : list[0]?.id;
        const course = key ? await api.courses.get(key) : null;
        if (alive) {
          setCourses(list);
          setDetail(course);
          setTopicId(null);
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
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const payload = {
        title: String(form.get("title")).trim(),
        code: String(form.get("code")),
        description: String(form.get("description")),
        exam_date: String(form.get("exam")) || undefined,
        available_hours_per_week: Number(form.get("hours")),
      };
      const course =
        editing && detail
          ? await api.courses.update(detail.id, payload)
          : await api.courses.create(payload);
      setActiveCourseId(course.id);
      window.dispatchEvent(new Event("learnloop-courses-changed"));
      setRevision((n) => n + 1);
      dialog.current?.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save course.");
    } finally {
      setBusy(false);
    }
  };
  const topic =
    detail?.topics.find((t) => t.id === topicId) || detail?.topics[0];
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="ONE SUBJECT AT A TIME"
        title="Your course workspace."
        description="Connect the concepts, materials and practice that move you forward."
        action={
          <button
            className="button"
            onClick={() => {
              setEditing(false);
              dialog.current?.showModal();
            }}
          >
            <Plus size={16} />
            Add course
          </button>
        }
      />
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      <div className="course-tabs" role="group" aria-label="Choose course">
        {courses.map((c) => (
          <button
            key={c.id}
            className={detail?.id === c.id ? "active" : ""}
            onClick={() => setActiveCourseId(c.id)}
          >
            <BookOpen size={17} />
            <span>
              {c.title}
              <small>{c.code || "Personal course"}</small>
            </span>
          </button>
        ))}
      </div>
      {detail ? (
        <>
          <section className="course-overview">
            <div>
              <span className="eyebrow">{detail.code || "YOUR COURSE"}</span>
              <h2>{detail.title}</h2>
              <p>
                {detail.description ||
                  "A dedicated space to develop your understanding."}
              </p>
            </div>
            <div className="course-overview-actions">
              <button
                className="button secondary"
                onClick={() => {
                  setEditing(true);
                  dialog.current?.showModal();
                }}
              >
                Edit course
              </button>
              <button
                className="icon-button"
                aria-label="Delete selected course"
                onClick={async () => {
                  if (!confirm("Delete this course and its learning records?"))
                    return;
                  try {
                    await api.courses.delete(detail.id);
                    window.dispatchEvent(
                      new Event("learnloop-courses-changed"),
                    );
                    setActiveCourseId(null);
                    setRevision((n) => n + 1);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Delete failed.");
                  }
                }}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </section>
          <div className="course-workspace">
            <Panel title="Concept navigator">
              {detail.topics.length ? (
                detail.topics.map((t, i) => (
                  <button
                    className={`topic-nav ${topic?.id === t.id ? "selected" : ""}`}
                    key={t.id}
                    onClick={() => setTopicId(t.id)}
                  >
                    <span className="task-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>
                      {t.title}
                      <small>
                        {Math.round(t.mastery_score * 100)}% mastery estimate
                      </small>
                    </span>
                    <ArrowRight size={14} />
                  </button>
                ))
              ) : (
                <EmptyState title="No topics yet">
                  This course does not have a topic map. The frontend does not
                  infer a map from an unprocessed upload.
                </EmptyState>
              )}
            </Panel>
            <Panel title={topic?.title || "Course overview"}>
              <span className="tag">
                {topic ? "Selected concept" : "Getting started"}
              </span>
              <h3>{topic?.title || "Bring your course together."}</h3>
              <p className="body-copy">
                {topic?.description ||
                  detail.learning_objectives ||
                  "Add materials and use the available course tools."}
              </p>
              {topic && (
                <>
                  <Progress
                    value={topic.mastery_score * 100}
                    label={`${topic.title} mastery estimate`}
                  />
                  <p className="fine-print">
                    This estimate comes from the learning engine; it is not a
                    course grade.
                  </p>
                  <h3>Related prerequisites</h3>
                  {topic.prerequisites?.length ? (
                    topic.prerequisites.map((key) => {
                      const related = detail.topics.find((t) => t.id === key);
                      return related ? (
                        <button
                          className="button secondary"
                          key={key}
                          onClick={() => setTopicId(key)}
                        >
                          {related.title}
                          <ArrowRight size={14} />
                        </button>
                      ) : null;
                    })
                  ) : (
                    <p className="body-copy">No prerequisite links recorded.</p>
                  )}
                </>
              )}
              <div className="form-actions">
                <Link className="button" to="/quizzes">
                  Practice this course
                  <ArrowRight size={16} />
                </Link>
                <Link className="text-link" to="/tutor">
                  Ask KEVIN
                </Link>
              </div>
            </Panel>
            <div className="page-stack">
              <Panel title="Course materials">
                <BookOpen size={25} />
                <p className="body-copy">
                  Keep your notes and syllabus close to your learning.
                </p>
                <Link className="text-link" to="/resources">
                  Open library
                  <ArrowRight size={14} />
                </Link>
              </Panel>
              <Panel title="Your study rhythm">
                <p className="body-copy">
                  {detail.available_hours_per_week} hours available each week
                  <br />
                  {detail.exam_date
                    ? `Exam: ${detail.exam_date}`
                    : "No exam date set"}
                </p>
                <Link className="text-link" to="/planner">
                  Review your plan
                  <ArrowRight size={14} />
                </Link>
              </Panel>
            </div>
          </div>
        </>
      ) : (
        <EmptyState title="Your next chapter starts here">
          Add a course to begin organizing your learning.
        </EmptyState>
      )}
      <dialog className="auth-dialog" ref={dialog}>
        <h2>{editing ? "Edit course" : "A new learning space"}</h2>
        <form key={`${editing}-${detail?.id}`} onSubmit={submit}>
          <label>
            Course title
            <input
              name="title"
              required
              maxLength={150}
              defaultValue={editing ? detail?.title : ""}
            />
          </label>
          <label>
            Course code
            <input name="code" defaultValue={editing ? detail?.code : ""} />
          </label>
          <label>
            Description
            <input
              name="description"
              defaultValue={editing ? detail?.description : ""}
            />
          </label>
          <label>
            Exam date (optional)
            <input
              name="exam"
              type="date"
              defaultValue={editing ? detail?.exam_date : ""}
            />
          </label>
          <label>
            Available hours per week
            <input
              name="hours"
              type="number"
              min="1"
              max="80"
              required
              defaultValue={editing ? detail?.available_hours_per_week : 5}
            />
          </label>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <button className="button" disabled={busy}>
              {busy ? "Saving…" : "Save course"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
