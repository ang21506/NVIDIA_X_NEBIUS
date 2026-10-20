import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  GraduationCap,
  FolderOpen,
  MessageSquare,
  BrainCircuit,
  CalendarDays,
  Activity,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  CheckSquare,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, type Course } from "../api/client";
import { ThemeControl, ThemeToggle } from "../context/ThemeContext";
import { Brand } from "./ui";
import { BranchedMenu } from "./BranchedMenu";
const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Courses", path: "/courses", icon: GraduationCap },
  { label: "AI Tutor · JARVIS", path: "/tutor", icon: MessageSquare },
  { label: "Study Planner", path: "/planner", icon: CalendarDays },
  { label: "Practice", path: "/quizzes", icon: CheckSquare },
  { label: "Learning Library", path: "/resources", icon: FolderOpen },
  { label: "Learning Memory", path: "/memory", icon: BrainCircuit },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
  { label: "Agent Activity", path: "/agent-activity", icon: Activity },
];
const navigationSections = [
  { label: "Study space", children: navigation.slice(0, 6) },
  { label: "Reflect & improve", children: navigation.slice(6) },
];
export function Layout() {
  const { user, logout, activeCourseId, setActiveCourseId } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [courseRevision, setCourseRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setCourseRevision((n) => n + 1);
    window.addEventListener("learnloop-courses-changed", refresh);
    return () =>
      window.removeEventListener("learnloop-courses-changed", refresh);
  }, []);
  const location = useLocation();
  useEffect(() => {
    let alive = true;
    api.courses
      .list()
      .then((list) => {
        if (!alive) return;
        setCourses(list);
        setError("");
        if (!list.some((c) => c.id === activeCourseId))
          setActiveCourseId(list[0]?.id || null);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [location.pathname, activeCourseId, setActiveCourseId, courseRevision]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {open && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${open ? "is-open" : ""}`}
        aria-label="Application navigation"
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <NavLink
          to="/dashboard"
          className="brand-link"
          onClick={() => setOpen(false)}
        >
          <Brand />
        </NavLink>
        <span className="nav-caption">WORKSPACE</span>
        <BranchedMenu
          sections={navigationSections}
          onNavigate={() => setOpen(false)}
        />
        <div className="sidebar-bottom">
          <NavLink
            className="nav-item"
            to="/settings"
            onClick={() => setOpen(false)}
          >
            <Settings size={19} />
            Settings & privacy
          </NavLink>
          <ThemeControl />
          <div className="profile-row">
            <span className="avatar">{user?.full_name?.slice(0, 1)}</span>
            <div>
              <strong>{user?.full_name}</strong>
              <small>
                Personal workspace
              </small>
            </div>
            <button
              className="icon-button"
              aria-label="Sign out"
              onClick={logout}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="icon-button mobile-menu"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span>
              Workspace <span className="breadcrumb-slash">/</span>{" "}
              <strong>
                {navigation.find((n) => n.path === location.pathname)?.label ||
                  "Preferences"}
              </strong>
            </span>
          </div>
          <div className="topbar-actions">
            <label className="course-picker">
              <span className="sr-only">Active course</span>
              <select
                value={activeCourseId || ""}
                onChange={(e) => setActiveCourseId(e.target.value)}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
                {!courses.length && <option value="">No courses yet</option>}
              </select>
            </label>
            <ThemeToggle />
          </div>
        </header>
        {error && (
          <div role="alert" className="error-banner">
            Could not load courses: {error}
          </div>
        )}
        <main id="main-content" className="workspace-content" tabIndex={-1}>
          <Outlet key={activeCourseId || "no-course"} />
        </main>
        <nav className="mobile-bottom" aria-label="Quick navigation">
          {[navigation[0], navigation[3], navigation[2], navigation[4]].map(
            (n) => (
              <NavLink key={n.path} to={n.path}>
                <n.icon size={20} />
                <span>{n.label.split(" ·")[0]}</span>
              </NavLink>
            ),
          )}
          <button onClick={() => setOpen(!open)} aria-label="More navigation">
            <Menu size={20} />
            <span>More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
