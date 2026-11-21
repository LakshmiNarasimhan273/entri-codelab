import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

import Navbar from './components/common/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MentorSecretRegisterPage from './pages/MentorSecretRegisterPage';
import MentorDashboardPage from './pages/MentorDashboardPage';
import LearnerAssessmentPage from './pages/LearnerAssessmentPage';

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex flex-col">
          <Routes>
            {/* Public Landing & Catalog */}
            <Route path="/" element={<LandingPage />} />

            {/* Public Authentication Views */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Dedicated Unlinked Obfuscated Mentor Invite Routes */}
            <Route
              path="/auth/invite/:secretToken"
              element={<MentorSecretRegisterPage />}
            />
            <Route
              path="/auth/invite/mentor-secret-signup-99x"
              element={<MentorSecretRegisterPage />}
            />

            {/* Mentor-Only Studio & Orchestration */}
            <Route
              path="/mentor"
              element={
                <ProtectedRoute allowedRoles={['MENTOR']}>
                  <MentorDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Protected Learner Assessment Room */}
            <Route
              path="/assessment/:id"
              element={
                <ProtectedRoute allowedRoles={['LEARNER', 'MENTOR']}>
                  <LearnerAssessmentPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

