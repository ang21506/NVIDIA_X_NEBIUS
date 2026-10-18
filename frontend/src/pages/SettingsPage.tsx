import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Download, Trash2, RotateCcw } from "lucide-react";
import { api, authStorage } from "../api/client";
import { DEMO_TOKEN } from "../api/demo";
import { useAuth } from "../context/AuthContext";
import { ThemeControl } from "../context/ThemeContext";
import { PageHeader, Panel } from "../components/ui";
export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.full_name || "");
  const [timezone, setTimezone] = useState(user?.timezone || "UTC");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const local = authStorage.getToken() === DEMO_TOKEN;
  const action = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };
  const profile = (e: FormEvent) => {
    e.preventDefault();
    void action(async () => {
      await api.auth.updateProfile({ full_name: name, timezone });
      await refreshUser();
      setMessage("Profile saved.");
    });
  };
  return (
    <div className="page-stack settings-page">
      <PageHeader
        eyebrow="YOUR WORKSPACE, YOUR CHOICES"
        title="Settings & privacy."
        description="A clear view of what is saved, where it lives, and what you can control."
      />
      {message && (
        <p className="success-banner" role="status">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}
      <div className="two-column">
        <Panel title="Your profile">
          <form className="form-grid" onSubmit={profile}>
            <label>
              Name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Timezone
              <input
                required
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </label>
            <button className="button" disabled={busy}>
              Save profile
            </button>
          </form>
        </Panel>
        <div className="page-stack">
          <Panel title="Appearance">
            <p className="body-copy">
              Choose your preferred reading environment. System follows your
              device setting.
            </p>
            <ThemeControl />
          </Panel>
          <Panel title="Learning preferences">
            <p className="body-copy">
              Set your daily target, explanation style and preferred difficulty.
              These preferences are saved in this browser only.
            </p>
            <Link className="text-link" to="/onboarding">
              Edit learning preferences →
            </Link>
            <p className="fine-print">
              Scheduled notifications are not connected. No reminders are sent
              by this frontend.
            </p>
          </Panel>
        </div>
      </div>
      <Panel title="Data & privacy">
        <div className="privacy-explanation">
          <span className="tag">
            {local ? "Local browser mode" : "Connected backend mode"}
          </span>
          <p className="body-copy">
            {local
              ? "Sample courses, answers, misconceptions and example tutor conversations are stored in browser localStorage. No live AI inference occurs. Uploads retain file metadata only."
              : "Your account and learning records are stored by the connected backend. Tutor requests may send document excerpts to its configured AI provider. This frontend cannot verify provider retention or training policies."}
          </p>
          <p className="body-copy">
            {local
              ? "Clear local history removes demo answers, memory, materials metadata and conversations. Your account display and course list remain."
              : "Clear learning history removes the records supported by the current API and resets mastery. It does not delete your account, uploads, documents or audio conversations. Export is the subset returned by the server."}
          </p>
        </div>
        <div className="privacy-actions">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() =>
              action(async () => {
                const data = await api.settings.exportData();
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "learnloop-export.json";
                link.click();
                URL.revokeObjectURL(url);
                setMessage(
                  "Available learning data exported. Browser-only preferences and personal sessions are not included in this export.",
                );
              })
            }
          >
            <Download size={16} />
            Export learning records
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => {
              if (
                confirm(
                  local
                    ? "Clear local demo learning history? Courses remain. No server data will change."
                    : "Clear server learning history? This does not delete uploads, conversations or your account.",
                )
              )
                void action(async () => {
                  const res = await api.settings.deleteData();
                  setMessage(
                    local
                      ? res.message
                      : "Learning records cleared through the API. Uploads, conversations and account data remain.",
                  );
                });
            }}
          >
            <Trash2 size={16} />
            {local ? "Clear local history" : "Clear learning history"}
          </button>
          {local && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => {
                if (
                  confirm(
                    "Replace all local demo records with the original sample course?",
                  )
                )
                  void action(async () => {
                    await api.settings.resetDemo();
                    await refreshUser();
                    setMessage("Local demo reset.");
                  });
              }}
            >
              <RotateCcw size={16} />
              Reset sample course
            </button>
          )}
        </div>
        <p className="fine-print">
          Theme preferences, onboarding preferences and personal sessions are
          stored separately in this browser. Clearing site storage removes them.
          Account deletion is not available in the current API.
        </p>
      </Panel>
      <Panel title="Learning memory & agent access">
        <div className="privacy-actions">
          <Link className="button secondary" to="/memory">
            Inspect learning memory
          </Link>
          <Link className="button secondary" to="/agent-activity">
            Inspect agent permissions
          </Link>
        </div>
        <p className="fine-print">
          Permission controls reflect the current backend implementation; they
          are not a guarantee that every API route enforces the grant.
        </p>
      </Panel>
    </div>
  );
}
