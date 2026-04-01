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
import { ErrorBoundary } from './components/ErrorBoundary';
import { StrategyProvider } from './contexts/StrategyContext';
import { Strategies } from './pages/Strategies';
import { StrategyDetail } from './pages/StrategyDetail';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const location = useLocation();

  // Always show a loading screen while auth state is being resolved.
  // This covers: initial session check, profile fetch, and token refresh.
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d16] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-gray-500 text-sm font-medium tracking-wide">Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Only redirect to onboarding when we are CERTAIN the profile has loaded
  // and onboarding is NOT yet completed.
  if (userProfile && !userProfile.onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // If user has completed onboarding but tries to access the onboarding page
  if (userProfile && userProfile.onboardingCompleted && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
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
    <ErrorBoundary>
      <AuthProvider>
        <AccountProvider>
          <StrategyProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="accounts" element={<Accounts />} />
                  <Route path="trades" element={<Trades />} />
                  <Route path="ai-engine" element={<AIEngine />} />
                  <Route path="journal" element={<Journal />} />
                  <Route path="strategies" element={<Strategies />} />
                  <Route path="strategies/:id" element={<StrategyDetail />} />
                  <Route path="market" element={<PlaceholderPage title="Market" subtitle="Live market data and analysis" />} />
                  <Route path="settings" element={<PlaceholderPage title="Settings" subtitle="Application preferences" />} />
                  <Route path="profile" element={<PlaceholderPage title="Profile" subtitle="User profile and security" />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </StrategyProvider>
        </AccountProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

