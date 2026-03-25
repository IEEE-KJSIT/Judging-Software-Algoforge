import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/judge', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-card bg-surface border border-divider mb-5 shadow-glow-sm">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 3L25 9V19L14 25L3 19V9L14 3Z" stroke="#6C63FF" strokeWidth="1.5" fill="none" />
              <path d="M14 8L20 11.5V18.5L14 22L8 18.5V11.5L14 8Z" fill="#6C63FF" fillOpacity="0.15" stroke="#6C63FF" strokeWidth="1" />
              <circle cx="14" cy="15" r="2.5" fill="#6C63FF" />
            </svg>
          </div>
          <h1 className="font-display text-xl font-700 text-text-primary tracking-tight">
            AlgoForge <span className="text-primary">'26</span>
          </h1>
          <p className="text-text-secondary text-xs mt-1.5 font-body">Hackathon Judging System</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-divider rounded-card p-6 shadow-card">
          <h2 className="font-display text-md font-500 text-text-primary mb-6">Sign in to continue</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-input bg-danger/10 border border-danger/30 text-danger text-sm font-body">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-2xs font-display font-500 text-text-secondary uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="judge@example.com"
                required
                className="w-full bg-surface-raised border border-divider rounded-input px-3.5 py-3 text-sm text-text-primary font-body placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-2xs font-display font-500 text-text-secondary uppercase tracking-widest mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-surface-raised border border-divider rounded-input px-3.5 py-3 text-sm text-text-primary font-body placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 min-h-[44px] bg-primary text-white rounded-btn px-4 py-2.5 text-sm font-display font-500 hover:brightness-110 hover:shadow-glow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-text-muted text-xs mt-6 font-body">
          IEEE-KJSIT · Hack-Judge v2
        </p>
      </div>
    </div>
  );
}
