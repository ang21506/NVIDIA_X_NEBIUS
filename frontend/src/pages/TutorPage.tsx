import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Send,
  Mic,
  Square,
  Copy,
  Volume2,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  api,
  authStorage,
  type AudioConversation,
  type AudioMessage,
  type TutorCitation,
} from "../api/client";
import { DEMO_TOKEN } from "../api/demo";
import { useAuth } from "../context/AuthContext";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { PageHeader, EmptyState } from "../components/ui";
export function TutorPage() {
  const { activeCourseId } = useAuth();
  const [conversations, setConversations] = useState<AudioConversation[]>([]);
  const [convId, setConvId] = useState<string | undefined>();
  const [messages, setMessages] = useState<AudioMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [model, setModel] = useState("Integration status unavailable");
  const [autoSpeak, setAutoSpeak] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const request = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const local = authStorage.getToken() === DEMO_TOKEN;
  const speak = (text: string) => {
    if (!window.speechSynthesis) {
      setNotice("Speech output is unavailable in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text.replace(/[*#`]/g, ""));
    const voice = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang === "en-GB");
    if (voice) speech.voice = voice;
    window.speechSynthesis.speak(speech);
  };
  useEffect(() => {
    let alive = true;
    api.tutor
      .listVoiceConversations(activeCourseId || undefined)
      .then((c) => {
        if (alive) {
          setConversations(c);
          setMessages([]);
          setConvId(undefined);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    api.tutor
      .getModels()
      .then((m) => {
        if (alive)
          setModel(
            m.is_configured
              ? `Configured: ${m.active_model}`
              : "No live model configured",
          );
      })
      .catch(() => {
        if (alive) setModel("Integration status unavailable");
      });
    return () => {
      alive = false;
      window.speechSynthesis?.cancel();
    };
  }, [activeCourseId]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy]);
  const send = async (text: string, audio?: Blob) => {
    if (!activeCourseId || !text.trim() || request.current) return;
    request.current = true;
    setBusy(true);
    setError("");
    setQuestion("");
    const stamp = new Date().toISOString();
    setMessages((m) => [
      ...m,
      {
        id: crypto.randomUUID(),
        conversation_id: convId || "",
        role: "user",
        transcript: text,
        citations: [],
        duration_seconds: 0,
        created_at: stamp,
      },
    ]);
    try {
      const answer = await api.tutor.askVoice(
        activeCourseId,
        text,
        audio,
        convId,
      );
      if (!mounted.current) return;
      setConvId(answer.conversation_id);
      setModel(answer.model_used);
      setMessages((m) => [
        ...m,
        {
          id: answer.message_id || crypto.randomUUID(),
          conversation_id: answer.conversation_id || "",
          role: "assistant",
          transcript: answer.answer,
          audio_url: answer.assistant_audio_url,
          citations: answer.citations,
          duration_seconds: 0,
          created_at: new Date().toISOString(),
        },
      ]);
      if (autoSpeak) speak(answer.speech_text || answer.answer);
      setConversations(await api.tutor.listVoiceConversations(activeCourseId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not get a response.");
      setQuestion(text);
    } finally {
      request.current = false;
      setBusy(false);
    }
  };
  const voice = useVoiceInput(send);
  const load = async (id: string) => {
    if (request.current) return;
    request.current = true;
    setBusy(true);
    try {
      const c = await api.tutor.getVoiceConversation(id);
      if (!mounted.current) return;
      setConvId(c.id);
      setMessages(c.messages);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load history.");
    } finally {
      request.current = false;
      setBusy(false);
    }
  };
  const citations: TutorCitation[] =
    messages.filter((m) => m.role === "assistant").at(-1)?.citations || [];
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="A LITTLE GUIDANCE GOES A LONG WAY"
        title="Think it through with JARVIS."
        description="Ask a question. Explore an example. Check the evidence."
      />
      <div className="tutor-workspace">
        <aside className="tutor-history">
          <button
            className="button secondary full"
            disabled={busy}
            onClick={() => {
              setMessages([]);
              setConvId(undefined);
              setError("");
            }}
          >
            <Plus size={16} />
            New conversation
          </button>
          <span className="nav-caption">RECENT CONVERSATIONS</span>
          {conversations.length ? (
            conversations.map((c) => (
              <button
                className={`conversation-link ${c.id === convId ? "selected" : ""}`}
                key={c.id}
                disabled={busy}
                onClick={() => load(c.id)}
              >
                <strong>{c.title}</strong>
                <small>
                  {c.message_count} messages ·{" "}
                  {new Date(c.updated_at).toLocaleDateString()}
                </small>
              </button>
            ))
          ) : (
            <p className="fine-print">Your conversations will appear here.</p>
          )}
          <label className="voice-toggle">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
            />
            Read replies aloud
          </label>
          <button
            className="text-link"
            onClick={() => window.speechSynthesis?.cancel()}
          >
            Stop speech
          </button>
        </aside>
        <section className="tutor-conversation">
          <div className="tutor-status">
            <span className="status-dot" />
            <strong>JARVIS</strong>
            <small>{local ? "Local example · no AI inference" : model}</small>
          </div>
          <div className="message-stream" aria-live="polite">
            {messages.length ? (
              messages.map((m) => (
                <article key={m.id} className={`tutor-message ${m.role}`}>
                  <span className="message-role">
                    {m.role === "user" ? "You" : "JARVIS"}
                  </span>
                  <div className="markdown">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {m.transcript}
                    </ReactMarkdown>
                  </div>
                  {m.audio_url && <audio controls src={m.audio_url} />}
                  <div className="message-actions">
                    {m.role === "assistant" && (
                      <>
                        <button
                          aria-label="Copy answer"
                          className="icon-button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(m.transcript);
                              setNotice("Answer copied.");
                            } catch {
                              setNotice(
                                "Clipboard access is unavailable. Select the answer text to copy it.",
                              );
                            }
                          }}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          aria-label="Read answer aloud"
                          className="icon-button"
                          onClick={() => speak(m.transcript)}
                        >
                          <Volume2 size={15} />
                        </button>
                      </>
                    )}
                    <small>
                      {new Date(m.created_at).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState title="What would you like to understand?">
                <span>Start with a concept from your course.</span>
                <div className="suggestion-prompts">
                  {[
                    "Explain binary search simply",
                    "Show a step-by-step worked example",
                    "Why is binary search O(log n)?",
                  ].map((p) => (
                    <button
                      className="button secondary"
                      key={p}
                      onClick={() => setQuestion(p)}
                    >
                      {p}
                      <ArrowRight size={14} />
                    </button>
                  ))}
                </div>
              </EmptyState>
            )}
            {busy && (
              <p role="status" className="body-copy">
                JARVIS is preparing a response…
              </p>
            )}
            <div ref={end} />
          </div>
          {(error || voice.error) && (
            <p role="alert" className="error-banner">
              {error || voice.error}
            </p>
          )}
          {notice && (
            <p role="status" className="fine-print">
              {notice}
            </p>
          )}
          <form
            className="tutor-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void send(question);
            }}
          >
            <label className="sr-only" htmlFor="tutor-question">
              Your question
            </label>
            <textarea
              id="tutor-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a follow-up or explore a new idea…"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(question);
                }
              }}
            />
            <div>
              <button
                type="button"
                className="icon-button"
                aria-label={voice.recording ? "Stop recording" : "Ask by voice"}
                disabled={busy || !activeCourseId}
                onClick={voice.recording ? voice.stop : voice.start}
              >
                {voice.recording ? <Square size={18} /> : <Mic size={18} />}
              </button>
              <small>
                {voice.recording
                  ? "Recording — tap stop to send"
                  : "Enter to send · Shift + Enter for a new line"}
              </small>
              <button
                className="button"
                disabled={busy || !question.trim() || !activeCourseId}
              >
                <Send size={16} />
                Send
              </button>
            </div>
          </form>
        </section>
        <aside className="tutor-sources">
          <BookOpen size={22} />
          <h2>Sources & context</h2>
          {citations.length ? (
            citations.map((c, i) => (
              <details key={`${c.resource_id}-${i}`} open>
                <summary>
                  {c.filename} · Page {c.page_number}
                </summary>
                <p>{c.excerpt}</p>
              </details>
            ))
          ) : (
            <p className="body-copy">
              {local
                ? "Local examples have no document citations. Your uploads are not indexed in this mode."
                : "References will appear when the tutor returns retrieved passages. No sources have been returned yet."}
            </p>
          )}
          <Link className="text-link" to="/resources">
            Open learning library
            <ArrowRight size={14} />
          </Link>
          <hr />
          <h3>Put it into practice</h3>
          <p className="body-copy">
            A different question can reveal whether an idea has clicked.
          </p>
          <Link className="button secondary" to="/quizzes">
            Practice this course
            <ArrowRight size={14} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
