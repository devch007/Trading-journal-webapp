/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { Trades } from './pages/Trades';
import { Journal } from './pages/Journal';
import { AIEngine } from './pages/AIEngine';
import { TopBar } from './lib/TopBar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AccountProvider } from './contexts/AccountContext';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-on-surface">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user is logged in but hasn't completed onboarding, and they aren't already on the onboarding page
  // We also check if userProfile is null (e.g. failed to load due to permissions) and force them to onboarding to try and create it
  if ((!userProfile || !userProfile.onboardingCompleted) && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // If user has completed onboarding but tries to access the onboarding page
  if (userProfile && userProfile.onboardingCompleted && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PlaceholderPage({ title, subtitle }: { title: string, subtitle: string }) {
  return (
    <div className="flex flex-col min-h-full pb-10">
      <TopBar title={title} subtitle={subtitle} showSearch={true} />
      <div className="px-8 flex-1 flex flex-col">
        <div className="glass-card p-8 rounded-2xl flex-1 flex items-center justify-center min-h-[400px]">
          <p className="text-on-surface-variant font-label text-lg">{title} module coming soon.</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AccountProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="trades" element={<Trades />} />
              <Route path="ai-engine" element={<AIEngine />} />
              <Route path="journal" element={<Journal />} />
              <Route path="market" element={<PlaceholderPage title="Market" subtitle="Live market data and analysis" />} />
              <Route path="settings" element={<PlaceholderPage title="Settings" subtitle="Application preferences" />} />
              <Route path="profile" element={<PlaceholderPage title="Profile" subtitle="User profile and security" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AccountProvider>
    </AuthProvider>
  );
}
