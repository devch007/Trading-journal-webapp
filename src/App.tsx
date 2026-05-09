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
import { PreTradeCheckout } from './pages/PreTradeCheckout';
import { TopBar } from './lib/TopBar';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AccountProvider } from './contexts/AccountContext';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StrategyProvider } from './contexts/StrategyContext';
import { Strategies } from './pages/Strategies';
import { StrategyDetail } from './pages/StrategyDetail';
import { Goals } from './pages/Goals';

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
                  <Route path="goals" element={<Goals />} />
                  <Route path="accounts" element={<Accounts />} />
                  <Route path="trades" element={<Trades />} />
                  <Route path="ai-engine" element={<AIEngine />} />
                  <Route path="checkout" element={<PreTradeCheckout />} />
                  <Route path="journal" element={<Journal />} />
                  <Route path="strategies" element={<Strategies />} />
                  <Route path="strategies/:id" element={<StrategyDetail />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="profile" element={<Profile />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </StrategyProvider>
        </AccountProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

