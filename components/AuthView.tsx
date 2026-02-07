import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseService';
import { Dumbbell } from 'lucide-react';

const AuthView: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

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
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        if (!data.session) {
          setSuccess('Account created. Check your email for the confirmation link, then sign in.');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Dumbbell size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-3xl font-bold">
            <span className="text-white">Strength</span>{' '}
            <span className="text-red-500">Architect</span>
          </h1>
          <p className="text-gray-400 mt-2">AI-powered barbell training programming</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-neutral-900 p-6 rounded-xl border border-neutral-800">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg bg-neutral-800 border border-neutral-700 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-neutral-800 border border-neutral-700 text-white"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">{success}</p>}

          <button
            type="submit"
            disabled={loading || !isSupabaseConfigured}
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white font-bold rounded-xl transition-all"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>

          {!isSupabaseConfigured && (
            <p className="text-xs text-gray-500">
              Missing Supabase config. Create a <span className="text-gray-400">.env.local</span> file with <span className="text-gray-400">SUPABASE_URL</span> and <span className="text-gray-400">SUPABASE_ANON_KEY</span>, then restart.
            </p>
          )}

          <p className="text-center text-sm text-gray-500">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-red-400 hover:text-red-300">
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default AuthView;
