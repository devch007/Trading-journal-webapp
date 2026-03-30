import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, BarChart2, Zap, Users, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, user, loading: authLoading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/');
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
      let msg = err.message || 'Failed to authenticate';
      if (err.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
      if (err.code === 'auth/email-already-in-use') msg = 'Email is already in use.';
      if (err.code === 'auth/weak-password') msg = 'Password is too weak.';
      setError(msg);
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
    <div className="min-h-screen flex flex-col md:flex-row font-body text-white bg-[#050505]">
      {/* Left Column */}
      <div className="hidden md:flex flex-col justify-center w-1/2 p-12 lg:p-24 relative overflow-hidden bg-moving-gradient">
        {/* Grid Background */}
        <div 
          className="absolute inset-0 z-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: '48px 48px'
          }}
        />
        {/* Radial gradient overlay */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_30%_50%,rgba(14,42,96,0.4)_0%,transparent_70%)] mix-blend-screen" />

        <div className="relative z-10 max-w-xl mx-auto w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-8 h-8 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M3 21H21" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 21V3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 15L12 10L16 13L21 6" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">Tradova Trading Journal</span>
          </div>

          <h1 className="text-[3.5rem] leading-[1.1] font-bold mb-6 tracking-tight text-white">
            Track, Analyze and<br />Master Markets
          </h1>
          <p className="text-lg text-[#888888] mb-16 max-w-md leading-relaxed">
            The professional trading journal that helps you become a consistently profitable trader.
          </p>

          <div className="space-y-8">
            <div className="flex items-start gap-5 group hover:translate-x-2 transition-transform duration-300 cursor-default">
              <div className="w-12 h-12 rounded-xl bg-[#0F172A] flex items-center justify-center shrink-0 border border-[#1E293B] group-hover:border-[#3B82F6]/50 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-300">
                <BarChart2 className="w-5 h-5 text-[#3B82F6] group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="pt-1">
                <h3 className="text-base font-semibold mb-1 text-white group-hover:text-[#3B82F6] transition-colors duration-300">Advanced Analytics</h3>
                <p className="text-[#888888] text-sm leading-relaxed">Deep insights into your trading patterns and performance metrics</p>
              </div>
            </div>

            <div className="flex items-start gap-5 group hover:translate-x-2 transition-transform duration-300 cursor-default">
              <div className="w-12 h-12 rounded-xl bg-[#0F172A] flex items-center justify-center shrink-0 border border-[#1E293B] group-hover:border-[#3B82F6]/50 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-300">
                <Zap className="w-5 h-5 text-[#3B82F6] group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="pt-1">
                <h3 className="text-base font-semibold mb-1 text-white group-hover:text-[#3B82F6] transition-colors duration-300">MetaTrader Integration</h3>
                <p className="text-[#888888] text-sm leading-relaxed">Auto-sync your trades from MT4/MT5 accounts in real-time</p>
              </div>
            </div>

            <div className="flex items-start gap-5 group hover:translate-x-2 transition-transform duration-300 cursor-default">
              <div className="w-12 h-12 rounded-xl bg-[#0F172A] flex items-center justify-center shrink-0 border border-[#1E293B] group-hover:border-[#3B82F6]/50 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-300">
                <Users className="w-5 h-5 text-[#3B82F6] group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="pt-1">
                <h3 className="text-base font-semibold mb-1 text-white group-hover:text-[#3B82F6] transition-colors duration-300">Trading Community</h3>
                <p className="text-[#888888] text-sm leading-relaxed">Connect with traders worldwide, share ideas and strategies</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="flex-1 flex flex-col relative bg-[#0A0A0A]">
        {/* Grid Background */}
        <div 
          className="absolute inset-0 z-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: '48px 48px'
          }}
        />

        {/* Theme Toggle */}
        <div className="absolute top-6 right-6 z-20">
          <button className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-white/5 flex items-center justify-center hover:bg-[#222222] transition-colors">
            <Sun className="w-5 h-5 text-[#F59E0B]" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10 w-full max-w-sm mx-auto">
          <div className="w-full text-center mb-10">
            <h2 className="text-3xl font-bold mb-3 text-white tracking-tight">Welcome</h2>
            <p className="text-[#888888] text-sm">Sign in or create an account</p>
          </div>

          {error && (
            <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm text-center">
              {error}
            </div>
          )}

          {!showEmailForm ? (
            <div className="w-full space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={isSubmitting || authLoading}
                className="w-full py-4 px-4 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 font-medium disabled:opacity-50 text-white shadow-sm text-sm google-glow relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="relative z-10">Continue with Google</span>
              </button>

              <div className="flex items-center gap-4 py-2">
                <div className="h-px bg-white/5 flex-1"></div>
                <span className="text-xs text-[#666666]">or</span>
                <div className="h-px bg-white/5 flex-1"></div>
              </div>

              <button
                onClick={() => setShowEmailForm(true)}
                className="w-full py-4 px-4 rounded-2xl bg-[#121212] border border-white/5 hover:bg-[#1A1A1A] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 font-medium text-white shadow-sm text-sm"
              >
                <Mail className="w-5 h-5 text-[#3B82F6]" />
                Continue with Email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
              <div className="flex flex-col text-left">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#121212] border border-white/5 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-[#3B82F6] transition-colors text-sm"
                  placeholder="Email address"
                />
              </div>
              <div className="flex flex-col text-left">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#121212] border border-white/5 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-[#3B82F6] transition-colors text-sm"
                  placeholder="Password"
                  minLength={6}
                />
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting || authLoading}
                className="w-full py-4 px-4 mt-2 rounded-2xl bg-[#3B82F6] text-white font-medium hover:bg-[#2563EB] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 text-sm glow-effect"
              >
                {isSubmitting ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
              
              <div className="flex justify-between items-center mt-4 px-1">
                <button 
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                  }}
                  className="text-xs text-[#888888] hover:text-white transition-colors"
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className="text-xs text-[#888888] hover:text-white transition-colors"
                >
                  Back
                </button>
              </div>
            </form>
          )}

          <div className="mt-16 text-center">
            <p className="text-[11px] text-[#666666] mb-8">
              By continuing, you agree to our <a href="#" className="underline hover:text-gray-300">Terms</a> and <a href="#" className="underline hover:text-gray-300">Privacy Policy</a>
            </p>
            <p className="text-[11px] text-[#444444]">
              © 2026 Powered by <a href="https://www.dctechnologies.in" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">DC Technologies</a>. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
