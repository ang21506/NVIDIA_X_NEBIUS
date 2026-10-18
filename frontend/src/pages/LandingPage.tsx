import { useState, useRef, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, X, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Brand } from "../components/ui";
import { useTheme } from "../context/ThemeContext";
import { LandingExperience } from "../components/LandingExperience";
export function LandingPage() {
  const { login, register, localDemoLogin } = useAuth();
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"login" | "register">("register");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const toggleTheme = () => setTheme(dark ? "light" : "dark");
  useEffect(() => {
    const target = dialog.current;
    return () => target?.close();
  }, []);
  const openAuth = (next: "login" | "register") => {
    setMode(next);
    setError("");
    dialog.current?.showModal();
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "register")
        await register(
          String(form.get("email")),
          String(form.get("password")),
          String(form.get("name")),
        );
      else await login(String(form.get("email")), String(form.get("password")));
      navigate(mode === "register" ? "/onboarding" : "/dashboard");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to connect. Try the local demo instead.",
      );
    } finally {
      setBusy(false);
    }
  };
  const startDemo = async () => {
    await localDemoLogin();
    navigate("/dashboard");
  };
  return (
    <div
      className="landing landing-editorial"
      data-landing-theme={dark ? "dark" : "light"}
    >
      <LandingExperience
        onAuth={openAuth}
        onDemo={startDemo}
        dark={dark}
        onToggleTheme={toggleTheme}
      />
      <dialog
        ref={dialog}
        className="auth-dialog"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <button
          className="icon-button dialog-close"
          aria-label="Close sign in"
          onClick={() => dialog.current?.close()}
        >
          <X size={20} />
        </button>
        <Brand />
        <h2>
          {mode === "register" ? "Begin your learning loop." : "Welcome back."}
        </h2>
        <p>
          {mode === "register"
            ? "Create your account with the connected backend."
            : "Sign in to your learning workspace."}
        </p>
        <form onSubmit={submit}>
          {mode === "register" && (
            <label>
              Your name
              <input
                name="name"
                required
                autoComplete="name"
                placeholder="Alex Taylor"
              />
            </label>
          )}
          <label>
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@university.edu"
            />
          </label>
          <label>
            Password
            <div className="password-field">
              <input
                name="password"
                type={visible ? "text" : "password"}
                minLength={8}
                required
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
              />
              <button
                type="button"
                className="icon-button"
                aria-label={visible ? "Hide password" : "Show password"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button className="button full" disabled={busy}>
            {busy
              ? "Connecting…"
              : mode === "register"
                ? "Create account"
                : "Sign in"}
            <ArrowRight size={16} />
          </button>
        </form>
        <button
          className="text-link"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          {mode === "login"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>
        <hr />
        <button className="button secondary full" onClick={startDemo}>
          Explore the local demo instead
        </button>
      </dialog>
    </div>
  );
}
