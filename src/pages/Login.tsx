import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

/* ── tiny floating particle ──────────────────────────────────────────── */
const NUM_PARTICLES = 18;
function Particles() {
  const particles = Array.from({ length: NUM_PARTICLES }, (_, i) => ({
    id: i,
    size: 3 + Math.random() * 5,
    x: 5 + Math.random() * 90,
    y: 5 + Math.random() * 90,
    delay: Math.random() * 6,
    duration: 5 + Math.random() * 8,
    opacity: 0.15 + Math.random() * 0.35,
  }));
  return (
    <div className="lp-particles" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className="lp-particle"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ── stat badge ──────────────────────────────────────────────────────── */
function StatBadge({ value, label, delay }: { value: string; label: string; delay: string }) {
  return (
    <div className="lp-stat-badge" style={{ animationDelay: delay }}>
      <span className="lp-stat-value">{value}</span>
      <span className="lp-stat-label">{label}</span>
    </div>
  );
}

export function Login() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, user, loading: authLoading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && !authLoading) navigate('/dashboard');
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (isSignUp) await signUpWithEmail(email, password);
      else await signInWithEmail(email, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    }
  };

  return (
    <div className="lp-root">

      {/* ══════════════ LEFT PANEL ══════════════ */}
      <div className="lp-left">
        {/* Multi-layer sky gradient */}
        <div className="lp-sky" />

        {/* Animated particles */}
        <Particles />

        {/* Gradient orbs */}
        <div className="lp-orb lp-orb-a" />
        <div className="lp-orb lp-orb-b" />
        <div className="lp-orb lp-orb-c" />
        <div className="lp-orb lp-orb-d" />

        {/* Top brand */}
        <div className="lp-brand">
          <div className="lp-brand-gem">
            <svg viewBox="0 0 24 24" fill="none" className="lp-brand-icon">
              <path d="M3 21H21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M3 21V3" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M7 15L12 10L16 13L21 6" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="lp-brand-name">TRADOVA</span>
        </div>

        {/* Floating stat badges */}
        <StatBadge value="94.7%" label="Win Rate" delay="0s" />
        <StatBadge value="+$18.2K" label="Avg Monthly" delay="0.3s" />

        {/* Mascot — full-bleed with rounded corners */}
        <div className="lp-mascot-wrap">
          <img
            src="/login-mascot.png"
            alt="Tradova mascot"
            className="lp-mascot"
            draggable={false}
          />
        </div>

        {/* Bottom frosted glass footer */}
        <div className="lp-left-footer">
          <div className="lp-footer-glass">
            <p className="lp-footer-eyebrow">Your Trading Edge</p>
            <h2 className="lp-footer-tagline">Where Money Grows.</h2>
            <p className="lp-footer-sub">
              Join thousands of traders who turned data into profit.
            </p>

          </div>
        </div>
      </div>

      {/* ══════════════ RIGHT PANEL ══════════════ */}
      <div className="lp-right">
        {/* Subtle dot grid texture */}
        <div className="lp-right-texture" />

        {/* Subtle gradient blobs in background */}
        <div className="lp-right-blob-1" />
        <div className="lp-right-blob-2" />

        <div className="lp-card" ref={formRef}>
          {/* Card top shine */}
          <div className="lp-card-shine" aria-hidden />

          {/* Logo */}
          <div className="lp-card-logo">
            <div className="lp-card-logo-gem">
              <svg viewBox="0 0 24 24" fill="none" className="lp-card-logo-icon">
                <path d="M3 21H21" stroke="#1D4ED8" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M3 21V3" stroke="#1D4ED8" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M7 15L12 10L16 13L21 6" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="lp-card-logo-text">Tradova</span>
          </div>

          {/* Heading */}
          <div className="lp-card-heading-block">
            <h1 className="lp-card-heading">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="lp-card-subheading">
              {isSignUp
                ? 'Start your trading journey today.'
                : 'Sign in to continue to your dashboard.'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="lp-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* ── Google Button (Primary CTA) ── */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || authLoading}
            className="lp-google-btn"
            id="google-signin-btn"
          >
            <div className="lp-google-btn-shine" aria-hidden />
            <svg className="lp-google-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="lp-divider">
            <span className="lp-divider-line" />
            <span className="lp-divider-text">or</span>
            <span className="lp-divider-line" />
          </div>

          {/* ── Email Form ── */}
          <form onSubmit={handleSubmit} className="lp-form" noValidate>
            {/* Email */}
            <div className={`lp-field ${focusedField === 'email' ? 'lp-field-focused' : ''} ${email ? 'lp-field-filled' : ''}`}>
              <label className="lp-field-label" htmlFor="lp-email">Email address</label>
              <div className="lp-field-input-wrap">
                <svg className="lp-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="2" y="4" width="20" height="16" rx="3"/><path d="m2 7 10 7 10-7"/>
                </svg>
                <input
                  id="lp-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="lp-input"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className={`lp-field ${focusedField === 'password' ? 'lp-field-focused' : ''} ${password ? 'lp-field-filled' : ''}`}>
              <label className="lp-field-label" htmlFor="lp-password">Password</label>
              <div className="lp-field-input-wrap">
                <svg className="lp-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="lp-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="lp-input"
                  placeholder="••••••••"
                  minLength={6}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
              </div>
            </div>

            {/* Remember + Forgot */}
            {!isSignUp && (
              <div className="lp-meta-row">
                <label className="lp-remember">
                  <span className="lp-checkbox-wrap">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="lp-checkbox-native"
                    />
                    <span className="lp-checkbox-custom">
                      {rememberMe && (
                        <svg viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                  </span>
                  <span className="lp-remember-text">Remember me</span>
                </label>
                <button type="button" className="lp-forgot">Forgot password?</button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || authLoading}
              className="lp-submit"
              id="email-signin-btn"
            >
              <span className="lp-submit-shine" aria-hidden />
              {isSubmitting ? (
                <span className="lp-spinner" />
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          {/* Toggle sign up / sign in */}
          <p className="lp-toggle-row">
            <span>{isSignUp ? 'Already have an account?' : "Don't have an account?"}</span>
            <button
              type="button"
              className="lp-toggle-btn"
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            >
              {isSignUp ? 'Sign in' : 'Sign up free'}
            </button>
          </p>

          {/* Footer */}
          <div className="lp-card-footer">
            <p className="lp-terms">
              By continuing, you agree to our{' '}
              <a href="#" className="lp-link">Terms of Service</a>
              {' & '}
              <a href="#" className="lp-link">Privacy Policy</a>
            </p>
            <p className="lp-copyright">
              © 2026 Powered by{' '}
              <a
                href="https://www.dctechnologies.in"
                target="_blank"
                rel="noopener noreferrer"
                className="lp-link"
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
