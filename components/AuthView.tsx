import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseService';
import { Dumbbell, ArrowRight } from 'lucide-react';

const AuthView: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) return;
    const t = window.setInterval(() => {
      setResendCooldownSeconds(s => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [resendCooldownSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setPendingEmailConfirmation(false);

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY, then restart the dev server.');
      return;
    }
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;

        if (!data.session) {
          setPendingEmailConfirmation(true);
          setSuccess('Account created. Check your email for the confirmation link.');
          setResendCooldownSeconds(60);
          setIsSignUp(false);
          setPassword('');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // ===== HERO LANDING =====
  if (!showForm) {
    return (
      <div className="relative min-h-screen flex flex-col bg-[#0a0a0a]">
        {/* Background — haunting B&W treatment */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/hero-bg.jpg')",
            filter: 'grayscale(100%) contrast(1.2) brightness(0.4)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90" />

        {/* Top nav */}
        <header className="relative z-10 flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Dumbbell size={22} className="text-amber-500" />
            <span className="text-lg font-bold tracking-tight text-white">
              Strength<span className="text-amber-500">Architect</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setShowForm(true); setIsSignUp(false); }}
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => { setShowForm(true); setIsSignUp(true); }}
              className="text-sm px-4 py-1.5 rounded-lg border border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black transition-all font-medium"
            >
              Get Started
            </button>
          </div>
        </header>

        {/* Hero */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6">
          <h1 className="text-5xl sm:text-6xl font-bold leading-tight">
            <span className="text-amber-500">Master the Art</span>
            <br />
            <span className="text-white">of Strength.</span>
          </h1>
          <p className="mt-4 text-gray-400 max-w-lg text-base sm:text-lg">
            Scientific periodization, sophisticated design, and analytics — all in your pocket.
          </p>
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => { setShowForm(true); setIsSignUp(true); }}
              className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg transition-all"
            >
              Get Started <ArrowRight size={18} />
            </button>
            <button
              onClick={() => { setShowForm(true); setIsSignUp(false); }}
              className="px-6 py-3 border border-gray-600 hover:border-gray-400 text-white font-medium rounded-lg transition-all"
            >
              Learn More
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="relative z-10 pb-8 flex justify-center">
          <div className="w-6 h-10 rounded-full border-2 border-gray-600 flex items-start justify-center p-1">
            <div className="w-1.5 h-2.5 bg-gray-500 rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    );
  }

  // ===== AUTH FORM =====
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-15"
        style={{
          backgroundImage: "url('/hero-bg.jpg')",
          filter: 'grayscale(100%) contrast(1.2) brightness(0.3)',
        }}
      />
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 max-w-md w-full space-y-8">
        <button
          onClick={() => setShowForm(false)}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Back
        </button>

        <div className="text-center">
          <Dumbbell size={48} className="mx-auto text-amber-500 mb-4" />
          <h1 className="text-3xl font-bold">
            <span className="text-white">Strength</span>{' '}
            <span className="text-amber-500">Architect</span>
          </h1>
          <p className="text-gray-400 mt-2">AI-powered barbell training programming</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-neutral-900/80 backdrop-blur p-6 rounded-xl border border-neutral-800"
        >
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg bg-neutral-800 border border-neutral-700 text-white focus:border-amber-500 focus:outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-neutral-800 border border-neutral-700 text-white focus:border-amber-500 focus:outline-none transition-colors"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-amber-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">{success}</p>}

          {pendingEmailConfirmation && (
            <div className="space-y-2 text-xs text-gray-400">
              <p>
                If the confirmation link won't open correctly while running locally, allowlist this redirect URL in Supabase Auth settings:
                <span className="text-gray-200"> {window.location.origin}</span>
              </p>
              <button
                type="button"
                disabled={resendCooldownSeconds > 0}
                onClick={async () => {
                  try {
                    setError('');
                    setSuccess('');
                    if (resendCooldownSeconds > 0) return;
                    const { error } = await supabase.auth.resend({
                      type: 'signup',
                      email,
                      options: { emailRedirectTo: window.location.origin },
                    });
                    if (error) throw error;
                    setSuccess('Confirmation email resent.');
                    setResendCooldownSeconds(60);
                  } catch (err: any) {
                    setError(err?.message || 'Failed to resend confirmation email');
                  }
                }}
                className="text-amber-400 hover:text-amber-300 disabled:text-gray-500 disabled:hover:text-gray-500"
              >
                {resendCooldownSeconds > 0
                  ? `Resend available in ${resendCooldownSeconds}s`
                  : 'Resend confirmation email'}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isSupabaseConfigured}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-800 text-black font-bold rounded-xl transition-all"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>

          {!isSupabaseConfigured && (
            <p className="text-xs text-gray-500">
              Missing Supabase config. Create a <span className="text-gray-400">.env.local</span> file with{' '}
              <span className="text-gray-400">SUPABASE_URL</span> and{' '}
              <span className="text-gray-400">SUPABASE_ANON_KEY</span>, then restart.
            </p>
          )}

          <p className="text-center text-sm text-gray-500">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-amber-400 hover:text-amber-300"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default AuthView;
