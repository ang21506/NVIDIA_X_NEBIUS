import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { Link } from "react-router-dom";
import type { Course } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./LearningMotion.css";

const notes = [
  "The big idea",
  "Connect the dots",
  "Try it yourself",
  "A little reflection",
  "Make it stick",
  "Begin again",
];

function StudyCover({ index }: { index: number }) {
  return (
    <div className={`study-cover cover-${index % 3}`} aria-hidden="true">
      <span>LEARN / EXPLORE / UNDERSTAND</span>
      <div className="cover-orbits">
        <i />
        <i />
        <i />
        <b />
      </div>
      <small>ONE IDEA AT A TIME</small>
    </div>
  );
}

/** A CSS 3D interpretation of the supplied React Bits circular gallery. */
export function CourseCarousel({ courses }: { courses: Course[] }) {
  const { setActiveCourseId } = useAuth();
  const [position, setPosition] = useState(0);
  const start = useRef<number | null>(null);
  const swiped = useRef(false);
  const count = courses.length;
  const selected = count ? ((position % count) + count) % count : 0;
  const move = (delta: number) => setPosition((p) => p + delta);
  if (!count) return null;
  return (
    <section
      className="course-gallery"
      aria-label="Your courses"
      aria-roledescription="carousel"
    >
      <div className="gallery-heading">
        <div>
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <h2>A shelf of possibilities.</h2>
        </div>
        <Link className="text-link" to="/courses">
          Manage courses <ArrowRight size={16} />
        </Link>
      </div>
      <div
        className="course-ring"
        tabIndex={count > 1 ? 0 : -1}
        aria-label="Course cards. Use left and right arrow keys to browse."
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            move(e.key === "ArrowLeft" ? -1 : 1);
          }
        }}
        onPointerDown={(e) => {
          start.current = e.clientX;
          swiped.current = false;
        }}
        onPointerCancel={() => {
          start.current = null;
        }}
        onPointerUp={(e) => {
          if (
            start.current !== null &&
            Math.abs(e.clientX - start.current) > 45 &&
            count > 1
          ) {
            swiped.current = true;
            move(e.clientX < start.current ? 1 : -1);
          }
          start.current = null;
        }}
      >
        {courses.map((course, i) => {
          let offset = (i - selected + count) % count;
          if (offset > count / 2) offset -= count;
          const visible = Math.abs(offset) <= 2;
          return (
            <button
              type="button"
              key={course.id}
              className={`course-ring-card ${i === selected ? "is-front" : ""}`}
              tabIndex={i === selected ? 0 : -1}
              aria-hidden={!visible}
              aria-label={`Focus ${course.title}`}
              aria-pressed={i === selected}
              style={{
                transform: `translateX(calc(-50% + ${offset * 185}px)) translateZ(${-Math.abs(offset) * 120}px) rotateY(${-offset * 24}deg)`,
                opacity: visible ? 1 - Math.abs(offset) * 0.23 : 0,
                visibility: visible ? "visible" : "hidden",
                zIndex: 5 - Math.abs(offset),
              }}
              onClick={() => {
                if (!swiped.current) setPosition((p) => p + offset);
                swiped.current = false;
              }}
            >
              <StudyCover index={i} />
              <span className="course-ring-title">
                <small>{course.code || "PERSONAL COURSE"}</small>
                <strong>{course.title}</strong>
              </span>
            </button>
          );
        })}
      </div>
      <div className="gallery-controls">
        <button
          className="icon-button"
          aria-label="Previous course"
          disabled={count < 2}
          onClick={() => move(-1)}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="gallery-caption">
          <span role="status" aria-live="polite">
            {selected + 1} / {count} · {courses[selected].title}
          </span>
          <Link
            className="text-link"
            to="/courses"
            onClick={() => setActiveCourseId(courses[selected].id)}
          >
            Open course <ArrowRight size={15} />
          </Link>
        </div>
        <button
          className="icon-button"
          aria-label="Next course"
          disabled={count < 2}
          onClick={() => move(1)}
        >
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}

/** Decorative helix: no scrolling interception or external image requests. */
export function LearningSpiral() {
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      element.dataset.visible = String(entry.isIntersecting);
    });
    observer.observe(element);
    const visibility = () => {
      element.dataset.hidden = String(document.hidden);
    };
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return (
    <div
      className="learning-spiral"
      ref={root}
      data-paused={paused}
      data-visible="false"
    >
      <div className="spiral-stage" aria-hidden="true">
        {notes.map((note, i) => (
          <div
            className="spiral-note"
            key={note}
            style={{ animationDelay: `${-i * 4}s` }}
          >
            <StudyCover index={i} />
            <span>{note}</span>
          </div>
        ))}
      </div>
      <div className="spiral-footer">
        <span>SMALL IDEAS. LASTING CONNECTIONS.</span>
        <button
          type="button"
          className="lp-theme-toggle"
          aria-label={
            paused ? "Play spiral animation" : "Pause spiral animation"
          }
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
      </div>
    </div>
  );
}
