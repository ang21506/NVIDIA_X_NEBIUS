import React, { useState } from 'react';
import { api, TutorAnswer } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  BotMessageSquare,
  Send,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Cpu,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  answerData?: TutorAnswer;
  timestamp: string;
}

export const TutorPage: React.FC = () => {
  const { activeCourseId } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'tutor',
      text: "Hello! I am your LearnLoop AI tutor, strictly grounded in your course materials. Ask me anything about your uploaded notes or lecture slides.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedCitation, setExpandedCitation] = useState<string | null>(null);

  const sampleQuestions = [
    "What is the accuracy paradox and why is accuracy misleading in imbalanced datasets?",
    "Explain precision versus recall with an example confusion matrix.",
    "Why does an unpruned decision tree lead to high variance and overfitting?",
  ];

  const handleSend = async (questionText?: string) => {
    const q = questionText || input;
    if (!q.trim() || !activeCourseId || loading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const resp = await api.tutor.ask({
        course_id: activeCourseId,
        question: q,
      });

      const tutorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'tutor',
        text: resp.answer,
        answerData: resp,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, tutorMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'tutor',
        text: `Error contacting tutor service: ${err.message}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BotMessageSquare className="w-5 h-5 text-cyan-400" /> Evidence-Grounded AI Tutor
          </h1>
          <p className="text-xs text-slate-400">
            Synthesizes answers with page citations from your course library via NVIDIA Nemotron.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          <Cpu className="w-3.5 h-3.5" />
          <span>NVIDIA Nemotron 3</span>
        </div>
      </div>

      {/* Suggested Quick Questions */}
      {messages.length === 1 && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-xs text-slate-400 font-semibold mb-2">Sample Course Inquiries:</div>
          <div className="flex flex-wrap gap-2">
            {sampleQuestions.map((sq, i) => (
              <button
                key={i}
                onClick={() => handleSend(sq)}
                className="text-xs text-left bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-500/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                {sq}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-3xl rounded-2xl p-4 text-xs leading-relaxed space-y-3 ${
                m.sender === 'user'
                  ? 'bg-cyan-600 text-white rounded-tr-none shadow-md shadow-cyan-600/10'
                  : 'bg-slate-900/80 border border-slate-800 text-slate-200 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>

              {/* Takeaways & Citations for Tutor Responses */}
              {m.answerData && (
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-3">
                  {/* Key Takeaways */}
                  {m.answerData.key_takeaways?.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                        Key Takeaways:
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-300">
                        {m.answerData.key_takeaways.map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Citations List */}
                  {m.answerData.citations?.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> Verified Source Citations ({m.answerData.citations.length}):
                      </span>
                      <div className="space-y-1.5">
                        {m.answerData.citations.map((c, idx) => {
                          const citeKey = `${m.id}-${idx}`;
                          const isExpanded = expandedCitation === citeKey;
                          return (
                            <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                              <div
                                onClick={() => setExpandedCitation(isExpanded ? null : citeKey)}
                                className="flex items-center justify-between cursor-pointer text-slate-300 font-semibold"
                              >
                                <span>
                                  📄 {c.filename} <span className="text-cyan-400">(Page {c.page_number})</span>
                                </span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </div>
                              {isExpanded && (
                                <p className="mt-2 text-slate-400 font-mono text-[10px] bg-slate-900/80 p-2 rounded border border-slate-800/80 leading-relaxed">
                                  "{c.excerpt}"
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Insufficiency / Uncertainty Notice */}
                  {!m.answerData.has_sufficient_evidence && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{m.answerData.uncertainty_notes || 'Answer could not be fully verified from course documents.'}</span>
                    </div>
                  )}

                  {/* Follow-up question chips */}
                  {m.answerData.follow_up_questions?.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Suggested Follow-ups:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {m.answerData.follow_up_questions.map((fq, fidx) => (
                          <button
                            key={fidx}
                            onClick={() => handleSend(fq)}
                            className="text-[10px] bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            {fq} →
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Latency and Model metadata */}
                  <div className="text-[9px] text-slate-500 flex items-center gap-3 pt-1">
                    <span>Model: {m.answerData.model_used}</span>
                    {m.answerData.latency_ms && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {m.answerData.latency_ms}ms
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <span className="text-[9px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-cyan-400 p-3 bg-slate-900/60 rounded-xl border border-slate-800 w-fit">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>Retrieving course chunks & synthesizing grounded Nemotron response...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your uploaded course notes..."
          disabled={loading}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-cyan-600/20"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Ask Tutor</span>
        </button>
      </form>
    </div>
  );
};
