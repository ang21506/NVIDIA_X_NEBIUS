import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Moon,
  Sun,
  Play,
  Shield,
  Plus,
  Minus,
} from "lucide-react";
import { Brand } from "./ui";
import { LearningSpiral } from "./LearningMotion";
import { DriftWall } from "./DriftWall";
import "./LandingExperience.css";

const stages = [
  {
    label: "Understand",
    title: "Start with the why.",
    copy: "Bring a tricky concept to JARVIS. Work through an explanation, ask a follow-up, and inspect the sources returned with the answer.",
    note: "JARVIS / CONCEPT NOTE",
    question: "Why is binary search so efficient?",
    answer:
      "Each comparison cuts the possibilities in half. Less searching. The same answer.",
    chips: ["64", "32", "16", "8", "4", "2", "1"],
  },
  {
    label: "Practice",
    title: "Give the idea a little test.",
    copy: "Answer one question at a time. See the reasoning behind the answer, then use that evidence to decide what needs another look.",
    note: "PRACTICE / QUICK CHECK",
    question: "64 candidates. Three halvings. How many remain?",
    answer:
      "64 → 32 → 16 → 8. A different question checks the same underlying idea.",
    chips: ["32", "8 ✓", "61", "3"],
  },
  {
    label: "Remember",
    title: "Make the next session count.",
    copy: "Keep a record of the ideas that tripped you up. A targeted recheck updates the memory and gives your revision a clear purpose.",
    note: "MEMORY / NEXT SESSION",
    question: "A mistake worth coming back to.",
    answer:
      "Confused linear and binary search? Revisit the halving principle, then try a fresh question.",
    chips: ["Notice", "Revisit", "Recheck"],
  },
];
export function LandingExperience({
  onAuth,
  dark,
  onToggleTheme,
}: {
  onAuth: (mode: "login" | "register") => void;
  dark: boolean;
  onToggleTheme: () => void;
}) {
  const [stage, setStage] = useState(0);
  const [faq, setFaq] = useState<number | null>(0);
  const current = stages[stage];
  return (
    <>
      <header className="lp-nav">
        <a href="#home" aria-label="LearnLoop home">
          <Brand />
        </a>
        <nav aria-label="Product navigation">
          <a href="#method">The method</a>
          <a href="#workspace">Your workspace</a>
          <a href="#questions">Questions</a>
        </nav>
        <div>
          <button
            className="lp-theme-toggle"
            onClick={onToggleTheme}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="lp-signin" onClick={() => onAuth("login")}>
            Sign in
          </button>
          <button className="lp-button" onClick={() => onAuth("register")}>
            Get started <ArrowUpRight size={16} />
          </button>
        </div>
      </header>
      <main>
        <section className="lp-hero" id="home">
          <div className="lp-hero-copy">
            <div className="lp-kicker">
              <span /> A little more understanding, every day.
            </div>
            <h1>
              Don’t just study.
              <br />
              Let it <em>sink in.</em>
            </h1>
            <p>
              A calmer place for your coursework, questions, and those “I
              finally get it” moments. Meet LearnLoop, your personal study
              companion.
            </p>
            <div className="lp-hero-actions">
              <button className="lp-button" onClick={() => onAuth("register")}>
                Find your learning rhythm <ArrowUpRight size={18} />
              </button>
              <a href="#method">
                <span className="lp-play">
                  <Play size={13} fill="currentColor" />
                </span>{" "}
                See how it works
              </a>
            </div>
            <small>Your courses. Your progress. Your own workspace.</small>
            <div className="lp-margin-note">
              <span className="lp-hand-arrow">↳</span> Built for the part where
              learning gets interesting.
            </div>
          </div>
          <div className="lp-art-scene">
            <div className="lp-art-frame">
              <img
                src="/images/study-sanctuary.png"
                width="1254"
                height="1254"
                fetchPriority="high"
                alt="A sculptural open book with a glowing green reading lamp, miniature trees, and a ceramic cup beside stacked books."
              />
              <span className="lp-art-caption">A LITTLE ROOM TO GROW.</span>
            </div>
            <div className="lp-art-label">
              <span>
                <Check size={17} />
              </span>
              <div>
                Your pace. Your space.<small>One idea at a time.</small>
              </div>
            </div>
            <span className="lp-art-side">THE ART OF UNDERSTANDING</span>
          </div>
        </section>
        <div className="lp-principles">
          <span>A WORKSPACE THAT WORKS WITH YOU</span>
          <p>Your coursework, connected.</p>
          <p>Practice with a purpose.</p>
          <p>Progress you can inspect.</p>
        </div>
        <section className="lp-method" id="method">
          <div className="lp-section-heading">
            <span className="lp-kicker">01 — THE LEARNING LOOP</span>
            <h2>
              Understanding isn’t a straight line.
              <br />
              <em>That’s the point.</em>
            </h2>
            <p>
              Ask. Try. Get it wrong. Come back to it.
              <br />A good study companion makes room for all of it.
            </p>
          </div>
          <div className="lp-method-grid">
            <div className="lp-method-copy">
              <div
                className="lp-tabs"
                role="tablist"
                aria-label="Explore the learning loop"
              >
                {stages.map((s, i) => (
                  <button
                    key={s.label}
                    id={`stage-tab-${i}`}
                    role="tab"
                    aria-selected={stage === i}
                    aria-controls="stage-panel"
                    tabIndex={stage === i ? 0 : -1}
                    onClick={() => setStage(i)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                        e.preventDefault();
                        const next = (i + (e.key === "ArrowRight" ? 1 : 2)) % 3;
                        setStage(next);
                        document.getElementById(`stage-tab-${next}`)?.focus();
                      }
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div
                id="stage-panel"
                role="tabpanel"
                aria-labelledby={`stage-tab-${stage}`}
              >
                <span className="lp-step-number">0{stage + 1}</span>
                <h3>{current.title}</h3>
                <p>{current.copy}</p>
                <button className="lp-text-button" onClick={() => onAuth("register")}>
                  Try it for yourself <ArrowRight size={17} />
                </button>
              </div>
            </div>
            <div className="lp-concept-paper" key={stage}>
              <div className="lp-paper-top">
                <span>{current.note}</span>
                <span>↗</span>
              </div>
              <h3>{current.question}</h3>
              <div className="lp-concept-chips">
                {current.chips.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
              <p>{current.answer}</p>
              <div className="lp-paper-footer">
                A closer look at the learning loop <span>LearnLoop AI</span>
              </div>
            </div>
          </div>
        </section>
        <section className="lp-workspace" id="workspace">
          <div className="lp-workspace-intro">
            <span className="lp-kicker">02 — A PLACE FOR IT ALL</span>
            <h2>
              Less tab-hopping.
              <br />
              <em>More headspace.</em>
            </h2>
            <p>
              Your study day has enough moving parts. Give them a place to come
              together.
            </p>
            <button className="lp-text-button" onClick={() => onAuth("register")}>
              Step inside the workspace <ArrowUpRight size={18} />
            </button>
            <LearningSpiral />
          </div>
          <div className="lp-workspace-list">
            {[
              [
                "01",
                "Coursework, in context",
                "Keep your courses, materials, and concepts together. Pick up with a clear next step.",
              ],
              [
                "02",
                "A plan you can adjust",
                "Make time for practice. Reschedule a session when life happens. See why a revision was suggested.",
              ],
              [
                "03",
                "A record of what clicked",
                "Look back at answers, learning gaps, and rechecks. See the evidence behind your progress.",
              ],
            ].map(([n, t, d]) => (
              <article key={n}>
                <span>{n}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
                <ArrowUpRight size={21} />
              </article>
            ))}
          </div>
        </section>
        <section className="lp-questions" id="questions">
          <div>
            <span className="lp-kicker">A FEW THINGS TO KNOW</span>
            <h2>
              Before you
              <br />
              <em>settle in.</em>
            </h2>
            <Shield size={28} />
          </div>
          <div>
            {[
              [
                "How do I get started?",
                "Create an account, add a course, and upload your study materials. Your workspace keeps your coursework and learning progress together.",
              ],
              [
                "How does JARVIS use my study materials?",
                "JARVIS retrieves relevant passages from your course materials to support its answers. AI explanations depend on service availability; check the references and any uncertainty noted in the response.",
              ],
              [
                "Where does my learning data go?",
                "Account and learning records are saved to your account, and uploaded materials are stored privately. Tutor requests may send relevant excerpts to the configured AI provider. Settings explains the available export and history controls.",
              ],
              [
                "Does completing a task mean I mastered it?",
                "No. A checked-off session records completion. Practice answers and targeted rechecks provide separate evidence of understanding.",
              ],
            ].map(([q, a], i) => (
              <article className="lp-faq" key={q}>
                <h3>
                  <button
                    aria-expanded={faq === i}
                    aria-controls={`faq-${i}`}
                    onClick={() => setFaq(faq === i ? null : i)}
                  >
                    {q}
                    {faq === i ? <Minus size={18} /> : <Plus size={18} />}
                  </button>
                </h3>
                <div id={`faq-${i}`} hidden={faq !== i}>
                  <p>{a}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="lp-end lp-end-wall">
          <div className="lp-end-copy">
          <span className="lp-kicker">YOUR NEXT “I GET IT” STARTS HERE</span>
          <h2>
            A fresh page.
            <br />
            <em>A clearer mind.</em>
          </h2>
          <button className="lp-button" onClick={() => onAuth("register")}>
            Open your study space <ArrowUpRight size={18} />
          </button>
          <p>Create an account to start your learning journey.</p>
          </div>
          <DriftWall />
        </section>
      </main>
      <footer className="lp-footer">
        <Brand />
        <span>Made for the way understanding happens.</span>
        <a href="#home">Back to top ↑</a>
        <button onClick={() => onAuth("register")}>
          Create an account <ArrowUpRight size={14} />
        </button>
      </footer>
    </>
  );
}
