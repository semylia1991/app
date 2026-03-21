import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, LogOut, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { t, Language } from '../i18n';

interface Props {
  lang: Language;
  onUserChange: (user: SupabaseUser | null) => void;
}

export function AuthButton({ lang, onUserChange }: Props) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      onUserChange(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      onUserChange(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-[#B89F7A]">
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="avatar"
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <User size={16} />
          )}
          <span className="hidden sm:block max-w-[120px] truncate">
            {user.user_metadata?.full_name || user.email}
          </span>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-[#B89F7A]/10 text-[#B89F7A] hover:bg-[#B89F7A]/20 hover:text-[#2C3E50] transition-all"
        >
          <LogOut size={12} />
          <span>{t[lang].signOut}</span>
        </button>
      </div>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={signInWithGoogle}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[#2C3E50] text-white shadow-md hover:bg-[#2C3E50]/90 transition-all disabled:opacity-50"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      {loading ? '...' : t[lang].signIn}
    </motion.button>
  );
}
