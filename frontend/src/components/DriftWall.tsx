import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play } from "lucide-react";
import "./DriftWall.css";

// Original, local vector illustrations for the supplied React Bits wall concept.
const artwork = (title: string, color: string, mark: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320"><rect width="480" height="320" fill="${color}"/><g fill="none" stroke="#345b43" stroke-width="1.5" opacity=".35"><circle cx="240" cy="145" r="88"/><circle cx="240" cy="145" r="64"/><path d="M80 145H400M240 35V255"/></g><text x="240" y="168" text-anchor="middle" font-family="Georgia,serif" font-size="66" fill="#294d39">${mark}</text><text x="30" y="290" font-family="Arial,sans-serif" font-size="16" letter-spacing="3" fill="#294d39">${title}</text></svg>`)}`;
const tiles = [
  { image: "/images/study-sanctuary.png", title: "A little room to grow" },
  {
    image: artwork("FIND THE PATTERN", "#dce5c9", "∑"),
    title: "Find the pattern",
  },
  {
    image: artwork("ASK A BETTER QUESTION", "#e9ddc6", "?"),
    title: "Ask a better question",
  },
  {
    image: artwork("CONNECT THE IDEAS", "#d7e3df", "∞"),
    title: "Connect the ideas",
  },
  { image: artwork("ONE SMALL STEP", "#e7e4d4", "↗"), title: "One small step" },
  {
    image: artwork("COME BACK TO IT", "#cdddbf", "↺"),
    title: "Come back to it",
  },
];

/** Typed adaptation of the user-supplied DriftWall, using CSS-driven tracks. */
export function DriftWall() {
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      element.dataset.visible = String(entry.isIntersecting);
    });
    observer.observe(element);
    const onVisibility = () => {
      element.dataset.hidden = String(document.hidden);
    };
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return (
    <div
      className="study-drift"
      ref={root}
      data-visible="false"
      data-paused={paused}
    >
      <div
        className="study-drift-viewport"
        aria-hidden="true"
        onPointerMove={(event) => {
          if (
            event.pointerType !== "mouse" ||
            matchMedia("(prefers-reduced-motion: reduce)").matches
          )
            return;
          const bounds = event.currentTarget.getBoundingClientRect();
          event.currentTarget.style.setProperty(
            "--drift-x",
            `${((event.clientX - bounds.left) / bounds.width - 0.5) * 5}deg`,
          );
          event.currentTarget.style.setProperty(
            "--drift-y",
            `${((event.clientY - bounds.top) / bounds.height - 0.5) * -5}deg`,
          );
        }}
        onPointerLeave={(event) => {
          event.currentTarget.style.setProperty("--drift-x", "0deg");
          event.currentTarget.style.setProperty("--drift-y", "0deg");
        }}
      >
        <div className="study-drift-plane">
          {[0, 1, 2].map((column) => {
            const items = [
              tiles[column * 2],
              tiles[column * 2 + 1],
              tiles[(column * 2 + 3) % tiles.length],
            ];
            return (
              <div
                className="study-drift-column"
                key={column}
                style={
                  { "--drift-duration": `${38 + column * 7}s` } as CSSProperties
                }
              >
                <div className="study-drift-track">
                  {[0, 1, 2].map((copy) => (
                    <div className="study-drift-group" key={copy}>
                      {items.map((item) => (
                        <div className="study-drift-tile" key={item.title}>
                          <img
                            src={item.image}
                            alt=""
                            width="480"
                            height="320"
                            loading="lazy"
                            decoding="async"
                            draggable={false}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="study-drift-controls">
        <span>A WORLD OF IDEAS, WITHIN REACH.</span>
        <button
          type="button"
          className="lp-theme-toggle"
          aria-label={paused ? "Play wall animation" : "Pause wall animation"}
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
      </div>
    </div>
  );
}
