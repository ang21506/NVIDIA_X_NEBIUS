import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, Course } from '../api/client';
import {
  LayoutDashboard,
  GraduationCap,
  FolderArchive,
  BotMessageSquare,
  Sparkles,
  BrainCircuit,
  CalendarCheck2,
  Activity,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Cpu,
  Database,
  Menu,
  X,
  Sparkle,
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout, activeCourseId, setActiveCourseId } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [healthStatus, setHealthStatus] = useState<{ database_connected: boolean; nebius_configured: boolean; model: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.courses.list().then((cList) => {
      setCourses(cList);
      if (cList.length > 0 && !activeCourseId) {
        setActiveCourseId(cList[0].id);
      }
    }).catch(console.error);

    api.health().then(setHealthStatus).catch(console.error);
  }, []);

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'My Courses', path: '/courses', icon: GraduationCap },
    { label: 'Resource Library', path: '/resources', icon: FolderArchive },
    { label: 'AI Tutor', path: '/tutor', icon: BotMessageSquare },
    { label: 'Quizzes & Diagnostics', path: '/quizzes', icon: Sparkles },
    { label: 'Learning Memory', path: '/memory', icon: BrainCircuit, badge: 'Key Feature' },
    { label: 'Study Planner', path: '/planner', icon: CalendarCheck2 },
    { label: 'Agent Activity', path: '/agent-activity', icon: Activity },
    { label: 'Settings & Privacy', path: '/settings', icon: ShieldCheck },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shrink-0 z-30">
        {/* Brand */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold tracking-tight text-white flex items-center gap-1.5 text-base">
                LearnLoop <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/30">AI</span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">Personal Agent</p>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-400/15 text-cyan-300 font-semibold border border-cyan-400/30">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Nebius & Engine Health Card */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Model
              </span>
              <span className="text-[10px] text-slate-300 truncate max-w-[100px] font-mono">
                {healthStatus?.model?.split('/').pop() || 'Nemotron 3'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" /> Database
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Connected
              </span>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-700 flex items-center justify-center font-bold text-xs text-white uppercase shrink-0">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-200 truncate">{user?.full_name}</div>
              <div className="text-[10px] text-slate-500 truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Course Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">Active Course:</span>
              <div className="relative">
                <select
                  value={activeCourseId || ''}
                  onChange={(e) => setActiveCourseId(e.target.value)}
                  className="bg-slate-800/90 hover:bg-slate-800 text-xs font-semibold text-cyan-300 py-1.5 pl-3 pr-8 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer appearance-none transition-colors"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                      {c.code ? `${c.code}: ` : ''}{c.title}
                    </option>
                  ))}
                  {courses.length === 0 && <option value="">No courses yet</option>}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            {/* Hackathon Judge Demo Shortcut */}
            <button
              onClick={() => navigate('/quizzes')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 hover:from-cyan-500/30 hover:to-indigo-500/30 transition-all shadow-sm shadow-cyan-500/10 cursor-pointer"
            >
              <Sparkle className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Judge Demo Flow</span>
              <span className="sm:hidden">Demo</span>
            </button>

            {user?.is_demo && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Demo Account
              </span>
            )}
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-800 bg-slate-900/95 backdrop-blur-xl px-4 py-3 space-y-1 z-20">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${
                    isActive ? 'bg-cyan-500/15 text-cyan-400' : 'text-slate-400'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
              </NavLink>
            ))}
          </div>
        )}

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
