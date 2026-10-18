# LearnLoop AI frontend · JARVIS

React, TypeScript and Vite frontend. This update changes only the frontend; the existing backend API remains unchanged.

## Start

```powershell
cd frontend
npm ci
npm run dev
```

Open the localhost address printed by Vite. Choose the local demo on the landing page to explore without a backend. Existing sign-in uses the API: development requests to `/v1` are proxied to `http://127.0.0.1:8000`. Set `VITE_API_BASE_URL` for another API origin. Never put API secrets in Vite environment variables.

## Screens and interactions

- Landing page, sign-in/registration forms and onboarding preferences.
- Dashboard and course workspace with prerequisites and next-step links.
- JARVIS tutor: conversation history, Markdown/math rendering, source excerpts, copy, and optional browser voice controls.
- Practice: answer navigation, scoring, explanations and targeted follow-up.
- Learning memory: evidence, status filtering and retests.
- Planner: day/week/month agendas, session creation, rescheduling and completion.
- Library: search, sort, upload validation, resource details and deletion.
- Analytics, agent activity, settings, export and privacy controls.
- Dark/light/system appearance, responsive sidebar and mobile navigation.

## Local demo boundaries

The demo is explicitly labeled and uses deterministic sample responses, not live inference. Browser storage persists quiz attempts, mastery, misconception evidence, revision tasks, conversations and course/resource metadata. A wrong binary-search answer creates a specific memory and revision; a successful targeted retest resolves that memory and completes its revision task. A later mistake reopens revision without retaining stale completion evidence. Other errors are not falsely classified as that misconception.

Uploads in local mode save metadata only, not document contents or embeddings. No autonomous tools execute. Browser preferences and personal sessions remain local even with a connected account. Planner completion is self-reported, not proof of mastery. Charts use recorded assessment data; no invented study-time or usage figures are displayed.

Real tutoring, retrieval, ingestion, authentication and server privacy enforcement require the existing backend. Backend behavior and live model credentials were not changed or validated in this frontend work. The planner currently uses accessible agendas rather than a drag-and-drop time grid. Social sign-in, billing and native mobile apps are not implemented.

## Checks

```powershell
npm test
npm run lint
npm run build
```

TypeScript strict mode is enabled. `demo.test.mjs` checks the learning loop, validation, mastery bounds, resource metadata and clearing sample data. Route components are loaded on demand.

## Implementation map

`src/context` owns authentication and theme state. `src/components` contains the responsive shell and shared UI. `src/pages` contains routed screens. `src/api/client.ts` retains the backend contracts; `src/api/demo.ts` provides the explicit local adapter. `src/index.css` defines semantic theme tokens and responsive layout.

## Shared visual design

The landing page and workspace now share the same light/dark/system preference through ThemeContext. New sessions default to light. The shared palette uses warm ivory and forest green in light mode, with deep green surfaces and sage accents in dark mode. `src/workspace.css` applies the editorial typography, surfaces, form controls and responsive spacing across all internal routes. The dashboard reuses the landing illustration.

The sidebar uses an adapted branched menu from the user-supplied React Bits source, with existing Lucide icons and native router links. Sections collapse accessibly; active routes control the highlighted branch. Mobile navigation keeps the quick-access bar and drawer.
