import React, { useEffect, useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { t, Language } from '../i18n';

interface Props { lang: Language; onUserChange: (user: SupabaseUser | null) => void; }

export function AuthButton({ lang, onUserChange }: Props) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); onUserChange(data.session?.user ?? null); });
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => { setUser(s?.user ?? null); onUserChange(s?.user ?? null); });
    return () => l.subscription.unsubscribe();
  }, []);

  const signIn = async () => { setLoading(true); await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }); setLoading(false); };
  const signOut = async () => { await supabase.auth.signOut(); };

  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#8A8078' }}>
          {user.user_metadata?.avatar_url
            ? <img src={user.user_metadata.avatar_url} alt="avatar" style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #DDD5C8' }} />
            : <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E8F2EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={13} color="#2D5A3D" /></div>}
        </div>
        <button onClick={signOut} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', border: '1px solid #DDD5C8',
          background: 'transparent', color: '#8A8078',
          fontSize: '0.55rem', fontWeight: 400, fontFamily: 'var(--font-sans)',
          letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = '#2D5A3D'; el.style.color = '#2D5A3D'; }}
        onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = '#DDD5C8'; el.style.color = '#8A8078'; }}>
          <LogOut size={11} />{t[lang].signOut}
        </button>
      </div>
    );
  }

  return (
    <button onClick={signIn} disabled={loading} data-auth-button style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '5px 10px', background: '#1A1410', color: '#FAF7F2',
      border: 'none', fontSize: '0.55rem', fontWeight: 500,
      fontFamily: 'var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase',
      cursor: 'pointer', opacity: loading ? 0.6 : 1, transition: 'background 0.2s'
    }}
    onMouseEnter={e => (e.currentTarget.style.background = '#2D5A3D')}
    onMouseLeave={e => (e.currentTarget.style.background = '#1A1410')}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      {loading ? '...' : t[lang].signIn}
    </button>
  );
}
