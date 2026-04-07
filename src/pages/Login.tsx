import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, user, loading: authLoading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    }
  };

  return (
    <div className="login-root">
      {/* ── LEFT PANEL ─────────────────────────────────────────────── */}
      <div className="login-left">
        {/* Sky gradient backdrop */}
        <div className="login-left-sky" />

        {/* Floating decorative orbs */}
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />

        {/* Mascot image — centered, fills panel */}
        <img
          src="/login-mascot.png"
          alt="Tradova bull mascot"
          className="login-mascot-img"
          draggable={false}
        />

        {/* Bottom overlay with tagline */}
        <div className="login-left-footer">
          <p className="login-tagline-sub">Your intelligent trading companion.</p>
          <h2 className="login-tagline">Where Money Grows.</h2>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────── */}
      <div className="login-right">
        <div className="login-form-card">

          {/* Logo */}
          <div className="login-logo-row">
            <div className="login-logo-gem">
              <svg viewBox="0 0 24 24" fill="none" className="login-logo-svg">
                <path d="M3 21H21" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M3 21V3" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M7 15L12 10L16 13L21 6" stroke="#1D4ED8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="login-logo-text">Tradova</span>
          </div>

          {/* Heading */}
          <div className="login-heading-block">
            <h1 className="login-heading">WELCOME BACK</h1>
            <p className="login-subheading">
              {isSignUp ? 'Create your account to get started.' : 'Sign in to your trading journal.'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          {/* ── Google CTA (primary) ── */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || authLoading}
            className="login-google-btn"
            id="google-signin-btn"
          >
            <svg className="login-google-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* ── Divider ── */}
          <div className="login-divider">
            <span className="login-divider-line" />
            <span className="login-divider-text">or sign in with email</span>
            <span className="login-divider-line" />
          </div>

          {/* ── Email form ── */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field-group">
              <label className="login-label" htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className="login-field-group">
              <label className="login-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                placeholder="••••••••"
                minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>

            {/* Remember me + Forgot password */}
            {!isSignUp && (
              <div className="login-remember-row">
                <label className="login-remember-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="login-checkbox"
                  />
                  <span>Remember me</span>
                </label>
                <button type="button" className="login-forgot-btn">
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Sign In pill */}
            <button
              type="submit"
              disabled={isSubmitting || authLoading}
              className="login-submit-btn"
              id="email-signin-btn"
            >
              {isSubmitting ? 'Processing…' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Sign up toggle */}
          <p className="login-signup-row">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            {' '}
            <button
              type="button"
              className="login-signup-link"
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>

          {/* Footer */}
          <div className="login-card-footer">
            <p className="login-terms">
              By continuing, you agree to our{' '}
              <a href="#" className="login-terms-link">Terms</a>
              {' '}and{' '}
              <a href="#" className="login-terms-link">Privacy Policy</a>
            </p>
            <p className="login-copyright">
              © 2026 Powered by{' '}
              <a
                href="https://www.dctechnologies.in"
                target="_blank"
                rel="noopener noreferrer"
                className="login-terms-link"
              >
                DC Technologies
              </a>
              . All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
