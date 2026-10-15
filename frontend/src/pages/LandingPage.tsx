import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BrainCircuit,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Upload,
  BookOpen,
  HelpCircle,
  Clock,
  RotateCcw,
  CheckCircle2,
  Lock,
  Cpu,
  Zap,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { demoLogin, login, register } = useAuth();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<'none' | 'login' | 'register'>('none');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleDemoAccess = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await demoLogin();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Demo access failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (authMode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, fullName);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
              LearnLoop <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/30">AI</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAuthMode('login')}
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={handleDemoAccess}
              disabled={submitting}
              className="flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-4 py-2 rounded-lg shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-white fill-white" />
              <span>Judge Instant Demo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(14,165,233,0.18),rgba(255,255,255,0))]"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-medium mb-6">
            <Cpu className="w-3.5 h-3.5" /> Powered by NVIDIA Nemotron & Nebius Token Factory
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6">
            Upload what you study. <br />
            <span className="gradient-text">LearnLoop learns what you need.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Every study session produces the next best action. Built for students preparing for examinations with
            persistent <strong className="text-cyan-400">Misconception Memory</strong>, evidence-grounded AI tutoring, and autonomous study replanning.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleDemoAccess}
              disabled={submitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Explore Machine Learning Demo Course</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
            >
              Create Free Account
            </button>
          </div>
        </div>
      </section>

      {/* The Adaptive Learning Loop */}
      <section className="py-16 border-y border-slate-800/80 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-xs uppercase tracking-widest text-cyan-400 font-bold mb-2">Architectural Workflow</h2>
            <p className="text-2xl sm:text-3xl font-bold text-white">The Continuous Closed-Loop Learning Cycle</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 glass-panel-hover">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 border border-cyan-500/20">
                <Upload className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">1. Ingest Course Materials</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload lecture slides, syllabus, and notes. PDF parser preserves page-level provenance with 450-word bounded chunks and semantic vector indexing.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 glass-panel-hover">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">2. Diagnostic Quizzing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Autonomous quiz engine presents targeted conceptual questions with deterministic backend scoring, isolating errors down to specific prerequisite nodes.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 glass-panel-hover">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 border border-cyan-500/20">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">3. Misconception Memory & Replanning</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Stores the exact misunderstanding, tracks remediation attempts, recalculates study priorities dynamically, and re-tests until verified resolved.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Misconception Memory Showcase */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-cyan-500/30 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-cyan-400 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                  Primary Innovation
                </span>
                <h3 className="text-2xl font-bold text-white mt-3">Misconception Memory In Action</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ordinary chatbots forget what you got wrong. LearnLoop tracks evidence, interventions, and resolution across sessions.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-amber-300">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Next Retest Scheduled: Tomorrow</span>
              </div>
            </div>

            {/* Demonstration Card */}
            <div className="bg-slate-950/80 rounded-2xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-semibold text-rose-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Detected Misconception
                </span>
                <span className="text-[11px] font-mono text-slate-400">Topic: Precision, Recall & Imbalanced Classes</span>
              </div>
              <p className="text-sm font-semibold text-slate-100">
                Belief that high overall accuracy guarantees high recall for minority classes in imbalanced datasets.
              </p>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-xs text-slate-300">
                <strong className="text-slate-100">Student Evidence:</strong> Selected "Yes, 98% accuracy guarantees high recall across all classes" on fraud detection question.
              </div>
              <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-xs text-cyan-200">
                <strong className="text-cyan-400">Intervention:</strong> Confusion matrix false-negative walkthrough with 990 legitimate vs 10 fraud sample breakdown.
              </div>
              <div className="flex items-center justify-between pt-2 text-xs">
                <span className="text-slate-400">Status: <strong className="text-amber-400">Needs Retest</strong></span>
                <span className="text-cyan-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolves only after correct targeted assessment
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Guarantee */}
      <section className="py-16 border-t border-slate-800/80 bg-slate-900/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 mb-4 border border-cyan-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Privacy-Aware & Student-Controlled</h2>
          <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed mb-8">
            Your materials are partitioned strictly by authenticated user ownership. Excerpts are processed exclusively for live Nemotron inference. We do not train models on your notes.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 mb-1">
                <Lock className="w-3.5 h-3.5 text-cyan-400" /> Isolated Data
              </div>
              <p className="text-[11px] text-slate-400">Tenant-level vector isolation prevents cross-student leakage.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 mb-1">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" /> Untrusted Data
              </div>
              <p className="text-[11px] text-slate-400">Prompt injection defense treats all uploaded documents as untrusted.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 mb-1">
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" /> 1-Click Purge
              </div>
              <p className="text-[11px] text-slate-400">Instant full data deletion removes derived chunks and embeddings immediately.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        <p>© 2026 LearnLoop AI — Built for the NVIDIA & Nebius Hackathon. All rights reserved.</p>
      </footer>

      {/* Auth Modal */}
      {authMode !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setAuthMode('none')}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-white mb-2">
              {authMode === 'login' ? 'Welcome Back' : 'Create Student Account'}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              {authMode === 'login' ? 'Sign in to access your courses and memory.' : 'Start your personalized learning journey with LearnLoop.'}
            </p>

            {error && (
              <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    placeholder="Jane Doe"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  placeholder="student@university.edu"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
              >
                {submitting ? 'Authenticating...' : (authMode === 'login' ? 'Sign In' : 'Register Account')}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
              {authMode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button onClick={() => setAuthMode('register')} className="text-cyan-400 font-semibold hover:underline">
                    Register
                  </button>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <button onClick={() => setAuthMode('login')} className="text-cyan-400 font-semibold hover:underline">
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
