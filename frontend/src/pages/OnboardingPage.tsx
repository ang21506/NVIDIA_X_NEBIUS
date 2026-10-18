import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { PageHeader, Panel } from "../components/ui";
export function OnboardingPage() {
  const { user, refreshUser, setActiveCourseId } = useAuth();
  const navigate = useNavigate();
  const key = `learnloop-preferences-${user?.id}`;
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem(key) || "null") || {
          name: user?.full_name || "",
          course: "",
          goal: "Strengthen weak concepts",
          minutes: "30",
          style: "Step by step",
          difficulty: "medium",
        }
      );
    } catch {
      return {
        name: user?.full_name || "",
        course: "",
        goal: "Strengthen weak concepts",
        minutes: "30",
        style: "Step by step",
        difficulty: "medium",
      };
    }
  });
  const update = (field: string, value: string) => {
    const next = { ...prefs, [field]: value };
    setPrefs(next);
    localStorage.setItem(key, JSON.stringify(next));
  };
  const finish = async () => {
    setBusy(true);
    setError("");
    try {
      if (prefs.name.trim())
        await api.auth.updateProfile({ full_name: prefs.name.trim() });
      if (prefs.course.trim()) {
        const course = await api.courses.create({
          title: prefs.course.trim(),
          available_hours_per_week: (Number(prefs.minutes) * 7) / 60,
          learning_objectives: prefs.goal,
        });
        setActiveCourseId(course.id);
      }
      await refreshUser();
      navigate("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="onboarding page-stack">
      <PageHeader
        eyebrow={`MAKE IT YOURS · STEP ${step + 1} OF 3`}
        title={
          [
            "A workspace that starts with you.",
            "What are you learning?",
            "Find your learning rhythm.",
          ][step]
        }
        description="A few useful details. You can change these later."
      />
      <div className="step-indicator" aria-label={`Step ${step + 1} of 3`}>
        {[0, 1, 2].map((i) => (
          <span className={i <= step ? "selected" : ""} key={i} />
        ))}
      </div>
      <Panel
        title={["Your profile", "Your first course", "Your preferences"][step]}
      >
        <div className="form-grid">
          {step === 0 && (
            <>
              <label>
                What should we call you?
                <input
                  value={prefs.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </label>
              <p className="body-copy">
                Your profile name is saved through the existing API. Learning
                preferences below are saved only in this browser.
              </p>
            </>
          )}
          {step === 1 && (
            <>
              <label>
                Course title (optional)
                <input
                  placeholder="e.g. Data Structures & Algorithms"
                  value={prefs.course}
                  onChange={(e) => update("course", e.target.value)}
                />
              </label>
              <label>
                Learning goal
                <select
                  value={prefs.goal}
                  onChange={(e) => update("goal", e.target.value)}
                >
                  {[
                    "Strengthen weak concepts",
                    "Prepare for upcoming exams",
                    "Improve understanding",
                    "Revise more consistently",
                  ].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </label>
              <p className="fine-print">
                Leave the course blank to keep your existing courses. Add
                materials in the Learning Library after setup.
              </p>
            </>
          )}
          {step === 2 && (
            <>
              <label>
                Daily target (minutes)
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={prefs.minutes}
                  onChange={(e) => update("minutes", e.target.value)}
                />
              </label>
              <label>
                Explanation style
                <select
                  value={prefs.style}
                  onChange={(e) => update("style", e.target.value)}
                >
                  {["Step by step", "Concise overview", "Worked examples"].map(
                    (s) => (
                      <option key={s}>{s}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Preferred difficulty
                <select
                  value={prefs.difficulty}
                  onChange={(e) => update("difficulty", e.target.value)}
                >
                  {["easy", "medium", "hard"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <p className="fine-print">
                These preferences are stored locally. Automatic reminders and
                preference-aware model responses are not connected yet.
              </p>
            </>
          )}
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            className="button secondary"
            disabled={!step || busy}
            onClick={() => setStep(step - 1)}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          {step < 2 ? (
            <button className="button" onClick={() => setStep(step + 1)}>
              Continue
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              className="button"
              disabled={
                busy || Number(prefs.minutes) < 5 || Number(prefs.minutes) > 480
              }
              onClick={finish}
            >
              {busy ? "Saving…" : "Open my workspace"}
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </Panel>
      <button className="text-link" onClick={() => navigate("/dashboard")}>
        Skip for now
      </button>
    </div>
  );
}
