import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/', { replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate('/', { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate('/', { replace: true });
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Check your inbox for a password reset link.');
    setMode('signin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-primary-foreground font-extrabold text-lg tracking-tight bg-primary rounded px-1.5 py-0.5 leading-none">CO</span>
          <span className="text-foreground font-bold text-lg tracking-tight">Pipeline</span>
        </div>
        <h1 className="text-xl font-bold text-foreground mb-1">
          {mode === 'signin' ? 'Sign in' : 'Reset your password'}
        </h1>
        <p className="text-sm text-muted-foreground mb-5">
          {mode === 'signin'
            ? 'Use your work email to load your own pipeline.'
            : "We'll email you a link to set a new password."}
        </p>

        <form onSubmit={mode === 'signin' ? handleSignIn : handleForgot} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@weareorbis.com"
            />
          </div>
          {mode === 'signin' && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {mode === 'signin' ? 'Sign in' : 'Send reset link'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'signin' ? 'forgot' : 'signin')}
          className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {mode === 'signin' ? 'Forgotten your password?' : 'Back to sign in'}
        </button>
      </div>
    </div>
  );
};

export default AuthPage;
