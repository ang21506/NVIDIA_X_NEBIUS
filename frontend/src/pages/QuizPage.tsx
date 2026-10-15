import React, { useState, useEffect } from 'react';
import { api, QuizItem, QuizResultResponse } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  BrainCircuit,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

export const QuizPage: React.FC = () => {
  const { activeCourseId } = useAuth();
  const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResultResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const startQuiz = async () => {
    if (!activeCourseId) return;
    setLoading(true);
    setResult(null);
    setSelectedAnswers({});
    try {
      const items = await api.quizzes.generate({
        course_id: activeCourseId,
        num_questions: 5,
      });
      setQuizItems(items);
    } catch (err: any) {
      alert(err.message || 'Failed generating quiz');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startQuiz();
  }, [activeCourseId]);

  const handleSelectOption = (itemId: string, option: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [itemId]: option }));
  };

  const handleSubmit = async () => {
    if (!activeCourseId) return;
    const answers = Object.entries(selectedAnswers).map(([itemId, sel]) => ({
      quiz_item_id: itemId,
      selected_answer: sel,
    }));

    if (answers.length < quizItems.length) {
      if (!confirm(`You have answered ${answers.length} of ${quizItems.length} questions. Submit anyway?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await api.quizzes.submit({
        course_id: activeCourseId,
        answers,
      });
      setResult(res);
    } catch (err: any) {
      alert(err.message || 'Error submitting quiz');
    } finally {
      setSubmitting(false);
    }
  };

  // Pre-fill Hackathon Judge Demo (Intentional Misconception)
  const handlePreFillJudgeDemo = () => {
    const demoAnswers: Record<string, string> = {};
    quizItems.forEach((q) => {
      if (q.question.includes('98% accuracy on a fraud detection')) {
        // Intentionally choose the misconception answer
        demoAnswers[q.id] = "Yes, 98% accuracy guarantees high recall across all classes.";
      } else {
        // Pick the first option
        demoAnswers[q.id] = q.options[0];
      }
    });
    setSelectedAnswers(demoAnswers);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-cyan-400" /> Diagnostic Quizzes & Assessments
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic scoring isolates misconceptions and recalculates mastery and priorities in real time.
          </p>
        </div>

        {!result && quizItems.length > 0 && (
          <button
            onClick={handlePreFillJudgeDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Hackathon Judge Error</span>
          </button>
        )}
      </div>

      {loading && (
        <div className="text-center py-12 text-xs text-cyan-400 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 animate-spin" />
          <span>Generating diagnostic assessment items...</span>
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="space-y-6">
          {/* Score Summary Box */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 glass-panel">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider">Assessment Scored</span>
                <h2 className="text-3xl font-extrabold text-white mt-1">
                  {result.score_percentage}% Score ({result.correct_items}/{result.total_items} Correct)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Deterministic grading complete. Topic mastery and study schedule have been updated.
                </p>
              </div>

              <button
                onClick={startQuiz}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer shadow-md shadow-cyan-600/20"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Take Another Quiz</span>
              </button>
            </div>

            {/* Detected Misconception Alert */}
            {result.detected_misconceptions.length > 0 && (
              <div className="mt-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                <div className="font-bold text-amber-300 flex items-center gap-2 text-sm">
                  <BrainCircuit className="w-4 h-4 text-amber-400" />
                  <span>Misconception Memory Triggered: {result.detected_misconceptions.length} Gap Identified</span>
                </div>
                {result.detected_misconceptions.map((m) => (
                  <div key={m.id} className="p-3 bg-slate-950/80 rounded-lg border border-amber-500/20 space-y-1">
                    <p className="font-semibold text-slate-200">{m.title}</p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{m.remediation}</p>
                    <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider pt-1">
                      Status: {m.status.replace('_', ' ')} • Target re-test scheduled
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Question Review Breakdown */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Item-by-Item Breakdown & Explanations</h3>
            {result.answers.map((ans, idx) => (
              <div
                key={ans.quiz_item_id}
                className={`p-5 rounded-xl border text-xs space-y-3 ${
                  ans.is_correct
                    ? 'bg-slate-900/40 border-emerald-500/30'
                    : 'bg-slate-900/60 border-rose-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-100">
                    {ans.is_correct ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>Question {idx + 1}</span>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${ans.is_correct ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {ans.is_correct ? 'Correct' : 'Incorrect'}
                  </span>
                </div>

                <p className="font-medium text-slate-200 leading-relaxed">{ans.question}</p>

                <div className="space-y-1 text-[11px]">
                  <div className="text-slate-300">
                    <strong className="text-slate-400">Your Selection:</strong> {ans.selected_answer}
                  </div>
                  {!ans.is_correct && (
                    <div className="text-emerald-400 font-semibold">
                      <strong className="text-slate-400">Expected:</strong> {ans.correct_answer}
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                  <strong className="text-cyan-400">Conceptual Explanation:</strong> {ans.explanation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz Form View */}
      {!result && !loading && (
        <div className="space-y-6">
          {quizItems.map((item, idx) => (
            <div key={item.id} className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-cyan-400">Question {idx + 1} of {quizItems.length}</span>
                <span className="font-mono uppercase text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  {item.difficulty}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-white leading-relaxed">{item.question}</h3>

              <div className="space-y-2">
                {item.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[item.id] === opt;
                  return (
                    <label
                      key={optIdx}
                      onClick={() => handleSelectOption(item.id, opt)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500 text-white font-medium'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name={item.id}
                        value={opt}
                        checked={isSelected}
                        onChange={() => handleSelectOption(item.id, opt)}
                        className="text-cyan-500 focus:ring-0"
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3.5 rounded-xl text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer shadow-lg shadow-cyan-600/25 flex items-center justify-center gap-2"
          >
            <span>{submitting ? 'Scoring Assessment & Updating Memory...' : 'Submit Diagnostic Quiz'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
