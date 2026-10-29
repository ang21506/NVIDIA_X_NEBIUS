# LearnLoop AI frontend · KEVIN

React, TypeScript and Vite frontend. The application uses real account authentication and the FastAPI backend.

## Start

```powershell
cd frontend
npm ci
npm run dev
```

Open the localhost address printed by Vite. Create an account or sign in to use your workspace. The backend must be running; development requests to `/v1` are proxied to `http://127.0.0.1:8000`. Set `VITE_API_BASE_URL` for another API origin. Never put API secrets in Vite environment variables.

## Screens and interactions

- Landing page, sign-in/registration forms and onboarding preferences.
- Dashboard and course workspace with prerequisites and next-step links.
- KEVIN tutor: conversation history, Markdown/math rendering, source excerpts, copy, and optional browser voice controls.
- Practice: answer navigation, scoring, explanations and targeted follow-up.
- Learning memory: evidence, status filtering and retests.
- Planner: day/week/month agendas, session creation, rescheduling and completion.
- Library: search, sort, upload validation, resource details and deletion.
- Analytics, agent activity, settings, export and privacy controls.
- Dark/light/system appearance, responsive sidebar and mobile navigation.

## Account-based workspace

Public demo entry points and browser-only API routing have been removed. All account and learning requests use the backend. Retired browser-demo session tokens are cleared on startup without deleting saved learning records. Backend demo login/reset are disabled by default through ENABLE_DEMO_MODE=false.

Browser preferences and personal planner sessions remain local. Completing a session is not proof of mastery. Live tutoring requires the configured AI provider; its availability is reported separately from account access. See ../backend/DATABASE.md for backend setup.

## Checks

```powershell
npm test
npm run lint
npm run build
```

TypeScript strict mode is enabled. `demo.test.mjs` checks a retired learning-engine fixture under tests/fixtures; that fixture is not imported or shipped by the application. Route components are loaded on demand.

## Implementation map

`src/context` owns authentication and theme state. `src/components` contains the responsive shell and shared UI. `src/pages` contains routed screens. `src/api/client.ts` sends requests to the backend. `src/index.css` defines semantic theme tokens and responsive layout.

## Shared visual design

The landing page and workspace now share the same light/dark/system preference through ThemeContext. New sessions default to light. The shared palette uses warm ivory and forest green in light mode, with deep green surfaces and sage accents in dark mode. `src/workspace.css` applies the editorial typography, surfaces, form controls and responsive spacing across all internal routes. The dashboard reuses the landing illustration.

The sidebar uses an adapted branched menu from the user-supplied React Bits source, with existing Lucide icons and native router links. Sections collapse accessibly; active routes control the highlighted branch. Mobile navigation keeps the quick-access bar and drawer.
# Learning motion

The dashboard's course gallery and landing page's study-note spiral are lightweight CSS 3D interpretations of the user-supplied React Bits CircularCarousel and InfiniteSpiral references. They use original CSS illustrations, without third-party image requests or new animation dependencies. They do not reproduce the references' bendable-card rendering or momentum physics.

The course gallery uses real course records, supports arrow buttons, keyboard navigation and swipe gestures, and opens the focused course. A single course stays centered; an empty workspace omits the gallery. The decorative spiral has pause/play controls, pauses on hover, off-screen and in hidden tabs, and becomes a static layout for reduced-motion preferences.
