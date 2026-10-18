import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { LandingPage } from "./pages/LandingPage";
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const CoursesPage = lazy(() =>
  import("./pages/CoursesPage").then((module) => ({
    default: module.CoursesPage,
  })),
);
const ResourcesPage = lazy(() =>
  import("./pages/ResourcesPage").then((module) => ({
    default: module.ResourcesPage,
  })),
);
const TutorPage = lazy(() =>
  import("./pages/TutorPage").then((module) => ({ default: module.TutorPage })),
);
const QuizPage = lazy(() =>
  import("./pages/QuizPage").then((module) => ({ default: module.QuizPage })),
);
const LearningMemoryPage = lazy(() =>
  import("./pages/LearningMemoryPage").then((module) => ({
    default: module.LearningMemoryPage,
  })),
);
const StudyPlannerPage = lazy(() =>
  import("./pages/StudyPlannerPage").then((module) => ({
    default: module.StudyPlannerPage,
  })),
);
const AgentActivityPage = lazy(() =>
  import("./pages/AgentActivityPage").then((module) => ({
    default: module.AgentActivityPage,
  })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);
import { ThemeProvider } from "./context/ThemeContext";
const AnalyticsPage = lazy(() =>
  import("./pages/AnalyticsPage").then((module) => ({
    default: module.AnalyticsPage,
  })),
);
const OnboardingPage = lazy(() =>
  import("./pages/OnboardingPage").then((module) => ({
    default: module.OnboardingPage,
  })),
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-cyan-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
          <span>Loading LearnLoop session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const PublicHomeRoute: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <LandingPage />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense
            fallback={
              <div className="loading-state" role="status">
                Loading workspace…
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<PublicHomeRoute />} />

              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/resources" element={<ResourcesPage />} />
                <Route path="/tutor" element={<TutorPage />} />
                <Route path="/quizzes" element={<QuizPage />} />
                <Route path="/memory" element={<LearningMemoryPage />} />
                <Route path="/planner" element={<StudyPlannerPage />} />
                <Route path="/agent-activity" element={<AgentActivityPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
