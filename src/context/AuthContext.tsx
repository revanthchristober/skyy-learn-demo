import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'tutor' | 'learner';
}

interface AuthContextType {
  user: UserProfile | null;
  supabaseUser: User | null;
  session: Session | null;
  loading: boolean;
  activeRole: 'tutor' | 'learner';
  signInAsTutor: () => Promise<void>;
  signInAsLearner: () => Promise<void>;
  signOut: () => Promise<void>;
  switchRole: (role: 'tutor' | 'learner') => void;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const DEFAULT_TUTOR_PROFILE: UserProfile = {
  id: 'ac8936e8-d718-4a34-8835-1468e2e49044',
  email: 'dakota.munro.tutor@gmail.com',
  fullName: 'Dakota Munro',
  role: 'tutor'
};

const DEFAULT_LEARNER_PROFILE: UserProfile = {
  id: 'bc8936e8-d718-4a34-8835-1468e2e49045',
  email: 'marcus.vance@gmail.com',
  fullName: 'Marcus Vance',
  role: 'learner'
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(DEFAULT_TUTOR_PROFILE);
  const [activeRole, setActiveRole] = useState<'tutor' | 'learner'>('tutor');
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    // 1. Get initial session from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setSupabaseUser(session.user);
        const metaRole = session.user.user_metadata?.role as 'tutor' | 'learner' || 'tutor';
        const role = metaRole === 'learner' ? 'learner' : 'tutor';
        setActiveRole(role);
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          role
        });
      }
      setLoading(false);
    });

    // 2. Synchronous onAuthStateChange subscriber (Context7 deadlock avoidance)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setSupabaseUser(session.user);
        const metaRole = session.user.user_metadata?.role as 'tutor' | 'learner' || 'tutor';
        const role = metaRole === 'learner' ? 'learner' : 'tutor';
        setActiveRole(role);
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          role
        });
      } else {
        setSupabaseUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInAsTutor = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'dakota.munro.tutor@gmail.com',
        password: 'SkyyLearn2026!'
      });
      if (error) {
        console.warn('Supabase signInWithPassword fallback to local profile:', error.message);
      }
      setActiveRole('tutor');
      setUser(DEFAULT_TUTOR_PROFILE);
      setIsAuthModalOpen(false);
    } catch (err) {
      console.warn('Tutor sign-in error:', err);
      setActiveRole('tutor');
      setUser(DEFAULT_TUTOR_PROFILE);
      setIsAuthModalOpen(false);
    }
  };

  const signInAsLearner = async () => {
    setActiveRole('learner');
    setUser(DEFAULT_LEARNER_PROFILE);
    setIsAuthModalOpen(false);
  };

  const switchRole = (newRole: 'tutor' | 'learner') => {
    setActiveRole(newRole);
    setUser(newRole === 'tutor' ? DEFAULT_TUTOR_PROFILE : DEFAULT_LEARNER_PROFILE);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSupabaseUser(null);
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        loading,
        activeRole,
        signInAsTutor,
        signInAsLearner,
        signOut,
        switchRole,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
