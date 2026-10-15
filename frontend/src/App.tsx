import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { CoursesPage } from './pages/CoursesPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { TutorPage } from './pages/TutorPage';
import { QuizPage } from './pages/QuizPage';
import { LearningMemoryPage } from './pages/LearningMemoryPage';
import { StudyPlannerPage } from './pages/StudyPlannerPage';
import { AgentActivityPage } from './pages/AgentActivityPage';
import { SettingsPage } from './pages/SettingsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
    <AuthProvider>
      <BrowserRouter>
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
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
