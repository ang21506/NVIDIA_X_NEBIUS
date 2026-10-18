import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { api, type QuizItem, type QuizResultResponse } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Panel, Progress, EmptyState } from "../components/ui";
export function QuizPage() {
  const { activeCourseId } = useAuth();
  const [items, setItems] = useState<QuizItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<QuizResultResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [round, setRound] = useState(0);
  useEffect(() => {
    let alive = true;
    if (!activeCourseId) return;
    api.quizzes
      .generate({ course_id: activeCourseId, num_questions: 5 })
      .then((q) => {
        if (alive) {
          setItems(q);
          setAnswers({});
          setIndex(0);
          setResult(null);
          setError("");
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [activeCourseId, round]);
  const submit = async () => {
    if (!activeCourseId || busy) return;
    setBusy(true);
    setError("");
    try {
      setResult(
        await api.quizzes.submit({
          course_id: activeCourseId,
          answers: items.map((q) => ({
            quiz_item_id: q.id,
            selected_answer: answers[q.id],
          })),
        }),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not submit. Your answers are still here.",
      );
    } finally {
      setBusy(false);
    }
  };
  const question = items[index];
  return (
    <div className="practice-page page-stack">
      <PageHeader
        eyebrow="MAKE UNDERSTANDING STICK"
        title={
          result
            ? "A little more clarity."
            : "One question. A deeper understanding."
        }
        description={
          result
            ? "Your answers have updated your learning record and study recommendations."
            : "Take your time. Feedback appears when you submit the assessment."
        }
      />
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button className="text-link" onClick={() => setRound((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}
      {result ? (
        <>
          <div className="metric-grid">
            <div className="metric-card">
              <span>Accuracy</span>
              <strong>{result.score_percentage}%</strong>
            </div>
            <div className="metric-card">
              <span>Correct answers</span>
              <strong>
                {result.correct_items}/{result.total_items}
              </strong>
            </div>
            <div className="metric-card">
              <span>To revisit</span>
              <strong>{result.total_items - result.correct_items}</strong>
            </div>
            <div className="metric-card">
              <span>Study plan</span>
              <strong style={{ fontSize: 20 }}>
                {result.planner_updated ? "Updated" : "Unchanged"}
              </strong>
            </div>
          </div>
          {result.answers.map((a) => (
            <Panel key={a.quiz_item_id} title={a.question}>
              <div
                className={`answer-feedback ${a.is_correct ? "correct" : "incorrect"}`}
              >
                {a.is_correct ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <XCircle size={20} />
                )}
                <strong>
                  {a.is_correct ? "Correct" : "Worth another look"}
                </strong>
              </div>
              <p className="body-copy">
                Your answer: {a.selected_answer}
                <br />
                Expected answer: {a.correct_answer}
              </p>
              <p>{a.explanation}</p>
              {a.detected_misconception && (
                <p className="fine-print">
                  Learning memory: {a.detected_misconception}
                </p>
              )}
            </Panel>
          ))}
          <div className="form-actions">
            <Link className="button secondary" to="/memory">
              View learning memory
            </Link>
            <button
              className="button"
              onClick={() => {
                setItems([]);
                setResult(null);
                setRound((n) => n + 1);
              }}
            >
              Try follow-up practice
              <ArrowRight size={16} />
            </button>
          </div>
        </>
      ) : question ? (
        <Panel
          title="Focused assessment"
          action={<span className="tag">{question.difficulty}</span>}
        >
          <div className="quiz-progress">
            <span>
              Question {index + 1} of {items.length}
            </span>
            <span>{Object.keys(answers).length} answered</span>
          </div>
          <Progress
            value={((index + 1) / items.length) * 100}
            label="Question progress"
          />
          <h2 className="question-title">{question.question}</h2>
          <fieldset className="answer-options">
            <legend className="sr-only">Choose an answer</legend>
            {question.options.map((option, i) => (
              <label
                key={option}
                className={`answer-option ${answers[question.id] === option ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={answers[question.id] === option}
                  onChange={() =>
                    setAnswers({ ...answers, [question.id]: option })
                  }
                />
                <span className="option-letter">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
          <div className="form-actions">
            <button
              className="button secondary"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
            >
              <ArrowLeft size={16} />
              Previous
            </button>
            {index < items.length - 1 ? (
              <button
                className="button"
                disabled={!answers[question.id]}
                onClick={() => setIndex(index + 1)}
              >
                Next question
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="button"
                disabled={busy || Object.keys(answers).length !== items.length}
                onClick={submit}
              >
                {busy ? "Saving answers…" : "Submit assessment"}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
          <button
            className="text-link"
            onClick={() => {
              if (
                confirm("Discard these unsubmitted answers and start again?")
              ) {
                setAnswers({});
                setIndex(0);
              }
            }}
          >
            Restart assessment
          </button>
        </Panel>
      ) : (
        !error && (
          <EmptyState
            title={
              activeCourseId ? "Loading practice…" : "Choose a course first"
            }
            to="/courses"
            label="Open courses"
          >
            Practice questions come from your selected course.
          </EmptyState>
        )
      )}
    </div>
  );
}
