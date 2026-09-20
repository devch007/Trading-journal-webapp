import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Sparkles, AlertCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// --- HELPER ICONS ---
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
  stat?: string;
}

const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    name: "Sarah Chen",
    handle: "Prop Trader • FTMO Funded",
    text: "TradeX transformed my risk consistency. The automated OCR journal and discipline tracker are unmatched.",
    stat: "+$34.8K PnL"
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    name: "Marcus Vance",
    handle: "Futures & FX Trader",
    text: "Session analytics showed me my edge is 80% London open. Doubled my average R:R in 30 days.",
    stat: "74% Win Rate"
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    name: "David Ross",
    handle: "Macro & Crypto Analyst",
    text: "AI Pilot Copilot knows my exact history and prevents revenge trades after stop-outs. Essential desk companion.",
    stat: "3.2 Profit Factor"
  }
];

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-200/90 dark:border-neutral-800 bg-gray-50/70 dark:bg-neutral-900/60 backdrop-blur-sm transition-all focus-within:border-blue-500 focus-within:bg-blue-50/20 dark:focus-within:bg-blue-950/20 focus-within:ring-2 focus-within:ring-blue-500/20">
    {children}
  </div>
);

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial; delay: string }) => (
  <div className={`animate-element ${delay} flex flex-col gap-2.5 rounded-3xl bg-white/85 dark:bg-[#16181f]/85 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 p-5 w-72 shadow-xl hover:shadow-2xl transition-all`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src={testimonial.avatarSrc} className="h-10 w-10 object-cover rounded-2xl border border-gray-200/60 dark:border-neutral-700" alt={testimonial.name} />
        <div>
          <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{testimonial.name}</p>
          <p className="text-[10px] text-gray-400 font-medium">{testimonial.handle}</p>
        </div>
      </div>
      {testimonial.stat && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          {testimonial.stat}
        </span>
      )}
    </div>
    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-normal">{testimonial.text}</p>
  </div>
);

export function Login() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, user, loading: authLoading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign-in could not be completed.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-white dark:bg-[#0e1017] text-gray-900 dark:text-white w-full overflow-x-hidden font-sans">
      
      {/* ── LEFT COLUMN: Sign In / Sign Up Form ── */}
      <section className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14 relative">
        <div className="w-full max-w-md space-y-7 my-auto">
          
          {/* Brand Header */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/25">
                X
              </div>
              <span className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">TradeX</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                PRO JOURNAL
              </span>
            </div>

            <h1 className="animate-element animate-delay-100 text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 text-gray-900 dark:text-white">
              {isSignUp ? 'Create your TradeX Account' : 'Welcome back to TradeX'}
            </h1>
            <p className="animate-element animate-delay-200 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {isSignUp 
                ? 'Join high-performing traders tracking edge, discipline, and daily PnL.' 
                : 'Access your real-time performance metrics, AI Copilot, and journals.'}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="animate-element p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Google Sign-in Button (Reliable Supabase Auth) */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || authLoading}
            type="button"
            className="animate-element animate-delay-300 w-full flex items-center justify-center gap-3 border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-2xl py-3.5 px-4 text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 transition-all shadow-2xs hover:shadow-md cursor-pointer disabled:opacity-50 group"
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="animate-element animate-delay-400 relative flex items-center justify-center my-2">
            <span className="w-full border-t border-gray-200 dark:border-neutral-800" />
            <span className="px-3.5 text-xs text-gray-400 bg-white dark:bg-[#0e1017] absolute font-medium">
              or continue with email
            </span>
          </div>

          {/* Email / Password Form */}
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            
            {/* Email Field */}
            <div className="animate-element animate-delay-500 space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Email Address</label>
              <GlassInputWrapper>
                <input
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trader@tradex.com"
                  className="w-full bg-transparent text-xs sm:text-sm px-4 py-3 rounded-2xl focus:outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
                />
              </GlassInputWrapper>
            </div>

            {/* Password Field */}
            <div className="animate-element animate-delay-600 space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Password</label>
              <GlassInputWrapper>
                <div className="relative flex items-center">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-transparent text-xs sm:text-sm px-4 py-3 pr-11 rounded-2xl focus:outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </GlassInputWrapper>
            </div>

            {/* Remember Me & Reset */}
            {!isSignUp && (
              <div className="animate-element animate-delay-700 flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
                  />
                  <span>Keep me signed in</span>
                </label>
                <button
                  type="button"
                  onClick={() => alert('Password reset email sent if account exists.')}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || authLoading}
              className="animate-element animate-delay-800 w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 text-xs sm:text-sm transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>{isSignUp ? 'Create TradeX Account' : 'Sign In to TradeX'}</span>
              )}
            </button>
          </form>

          {/* Toggle Sign Up vs Sign In */}
          <p className="animate-element animate-delay-900 text-center text-xs text-gray-500 dark:text-gray-400">
            {isSignUp ? 'Already have an account?' : 'New to TradeX platform?'}{' '}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline ml-1 cursor-pointer"
            >
              {isSignUp ? 'Sign In' : 'Create Free Account'}
            </button>
          </p>

          {/* Footer Copyright */}
          <div className="pt-4 border-t border-gray-100 dark:border-neutral-900 text-center text-[11px] text-gray-400 space-y-1">
            <p>
              By continuing, you agree to our{' '}
              <a href="#" className="underline hover:text-gray-700 dark:hover:text-gray-300">Terms of Service</a> &{' '}
              <a href="#" className="underline hover:text-gray-700 dark:hover:text-gray-300">Privacy Policy</a>
            </p>
            <p className="text-[10px] text-gray-400/80">© 2026 TradeX Technologies. All rights reserved.</p>
          </div>

        </div>
      </section>

      {/* ── RIGHT COLUMN: Hero Showcase & Live Testimonials ── */}
      <section className="hidden lg:flex flex-1 relative p-6 items-center justify-center overflow-hidden">
        {/* Background Visual Container */}
        <div 
          className="animate-slide-right animate-delay-200 absolute inset-6 rounded-3xl bg-cover bg-center overflow-hidden border border-gray-200/80 dark:border-neutral-800 shadow-2xl"
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=2000&auto=format&fit=crop')`,
          }}
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 backdrop-blur-[1px]" />

          {/* Top Banner inside Hero */}
          <div className="absolute top-8 left-8 right-8 flex items-center justify-between text-white z-10">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>AI Pilot Copilot & Analytics 2.0</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-full border border-emerald-500/30">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Real-Time Execution OCR</span>
            </div>
          </div>

          {/* Hero Center Title */}
          <div className="absolute top-28 left-8 right-8 z-10 max-w-lg">
            <h2 className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-tight">
              Master Your Psychology.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
                Compound Your Capital.
              </span>
            </h2>
            <p className="text-xs xl:text-sm text-gray-300 mt-2 font-normal leading-relaxed">
              Automated MT4/MT5 trade capture, deep session bias analysis, and AI coaching engineered for serious traders.
            </p>
          </div>

          {/* Bottom Testimonial Stack */}
          <div className="absolute bottom-8 left-8 right-8 z-10 flex gap-4 overflow-x-auto no-scrollbar justify-start xl:justify-center">
            <TestimonialCard testimonial={sampleTestimonials[0]} delay="animate-delay-600" />
            <TestimonialCard testimonial={sampleTestimonials[1]} delay="animate-delay-800" />
            <div className="hidden 2xl:block">
              <TestimonialCard testimonial={sampleTestimonials[2]} delay="animate-delay-1000" />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

