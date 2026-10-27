/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AccountProvider } from './contexts/AccountContext';
import { StrategyProvider } from './contexts/StrategyContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy-loaded routes for performance & production code-splitting
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Accounts = lazy(() => import('./pages/Accounts').then(m => ({ default: m.Accounts })));
const Trades = lazy(() => import('./pages/Trades').then(m => ({ default: m.Trades })));
const Journal = lazy(() => import('./pages/Journal').then(m => ({ default: m.Journal })));
const AIEngine = lazy(() => import('./pages/AIEngine').then(m => ({ default: m.AIEngine })));
const PreTradeCheckout = lazy(() => import('./pages/PreTradeCheckout').then(m => ({ default: m.PreTradeCheckout })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Strategies = lazy(() => import('./pages/Strategies').then(m => ({ default: m.Strategies })));
const StrategyDetail = lazy(() => import('./pages/StrategyDetail').then(m => ({ default: m.StrategyDetail })));
const Goals = lazy(() => import('./pages/Goals').then(m => ({ default: m.Goals })));
const Investments = lazy(() => import('./pages/Investments').then(m => ({ default: m.Investments })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Onboarding = lazy(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })));

function PageLoadingFallback() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      <span className="text-xs text-gray-400 font-medium tracking-wide">Loading module...</span>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const location = useLocation();

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

  if (userProfile && !userProfile.onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

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
              <Suspense fallback={<PageLoadingFallback />}>
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
                    <Route path="investments" element={<Investments />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="profile" element={<Profile />} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </StrategyProvider>
        </AccountProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

