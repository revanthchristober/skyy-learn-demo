import React, { useState } from 'react';
import { 
  X, Shield, User, GraduationCap, CheckCircle2, Database, Key, 
  LogIn, UserPlus, AlertCircle, Loader2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    user, 
    activeRole, 
    signInAsTutor, 
    signInAsLearner,
    signInWithCredentials,
    signUpWithCredentials,
    signOut,
    session 
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'personas' | 'custom'>('personas');
  const [customMode, setCustomMode] = useState<'signin' | 'signup'>('signin');
  
  // Custom form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'tutor' | 'learner'>('learner');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (customMode === 'signin') {
        const res = await signInWithCredentials(email, password);
        if (!res.success) {
          setFormError(res.error || 'Failed to sign in. Please verify your credentials.');
        }
      } else {
        if (!fullName.trim()) {
          setFormError('Please enter your full name');
          setIsSubmitting(false);
          return;
        }
        const res = await signUpWithCredentials(email, password, fullName, role);
        if (!res.success) {
          setFormError(res.error || 'Failed to create account.');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b0e14] border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Supabase Auth &amp; Access Control
            </h2>
            <p className="text-xs text-slate-400">
              GoTrue JWT authentication with PostgreSQL Row-Level Security
            </p>
          </div>
        </div>

        {/* Current status banner */}
        <div className="p-3 bg-[#07090e] border border-slate-800 rounded-lg flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-400">Active Persona:</span>
            <div className="flex items-center gap-1.5 font-medium text-white">
              <span className={`w-2 h-2 rounded-full ${activeRole === 'tutor' ? 'bg-indigo-400' : 'bg-emerald-400'}`}></span>
              {user ? user.fullName : 'Guest'}
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {activeRole}
              </span>
            </div>
          </div>
          {session && (
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                JWT Active
              </span>
              <div className="text-[10px] text-slate-500 font-mono">
                Expires in 3600s
              </div>
            </div>
          )}
        </div>

        {/* Tab switchers */}
        <div className="grid grid-cols-2 gap-1.5 bg-[#07090e] p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => { setActiveTab('personas'); setFormError(null); }}
            className={`py-1.5 rounded-md font-medium transition ${
              activeTab === 'personas'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Demo Personas
          </button>
          <button
            onClick={() => { setActiveTab('custom'); setFormError(null); }}
            className={`py-1.5 rounded-md font-medium transition ${
              activeTab === 'custom'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Custom Account
          </button>
        </div>

        {activeTab === 'personas' ? (
          /* Persona quick switch buttons */
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Instant 1-Click Role Switch
            </label>

            <button
              onClick={signInAsTutor}
              className={`w-full p-3.5 rounded-lg border text-left flex items-start gap-3 transition ${
                activeRole === 'tutor'
                  ? 'border-indigo-500 bg-indigo-950/20 text-white'
                  : 'border-slate-800 bg-[#07090e] text-slate-300 hover:border-slate-700 hover:bg-slate-900/50'
              }`}
            >
              <div className={`p-2 rounded-lg ${activeRole === 'tutor' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Dakota Munro (Founder / Tutor)</span>
                  {activeRole === 'tutor' && <span className="text-[11px] text-indigo-400 font-semibold">Active</span>}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Full authority: edit notes, generate Groq drills, review auditor flags, approve drills.
                </p>
                <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center gap-1">
                  <Key className="w-3 h-3" />
                  dakota.munro.tutor@gmail.com
                </div>
              </div>
            </button>

            <button
              onClick={signInAsLearner}
              className={`w-full p-3.5 rounded-lg border text-left flex items-start gap-3 transition ${
                activeRole === 'learner'
                  ? 'border-emerald-500 bg-emerald-950/20 text-white'
                  : 'border-slate-800 bg-[#07090e] text-slate-300 hover:border-slate-700 hover:bg-slate-900/50'
              }`}
            >
              <div className={`p-2 rounded-lg ${activeRole === 'learner' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Marcus Vance (Learner)</span>
                  {activeRole === 'learner' && <span className="text-[11px] text-emerald-400 font-semibold">Active</span>}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Practice access: locked until tutor approves, answers questions, logs attempts, flags friction.
                </p>
                <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center gap-1">
                  <Key className="w-3 h-3" />
                  marcus.vance@gmail.com
                </div>
              </div>
            </button>
          </div>
        ) : (
          /* Custom email/password login/signup form */
          <form onSubmit={handleCustomSubmit} className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-medium text-slate-300">
                {customMode === 'signin' ? 'Sign in to Supabase' : 'Create new account'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCustomMode(customMode === 'signin' ? 'signup' : 'signin');
                  setFormError(null);
                }}
                className="text-[11px] text-blue-400 hover:text-blue-300 transition"
              >
                {customMode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            {customMode === 'signup' && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Account Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('learner')}
                      className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition ${
                        role === 'learner'
                          ? 'border-emerald-500/80 bg-emerald-950/30 text-emerald-300'
                          : 'border-slate-800 bg-[#07090e] text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      Learner
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('tutor')}
                      className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition ${
                        role === 'tutor'
                          ? 'border-indigo-500/80 bg-indigo-950/30 text-indigo-300'
                          : 'border-slate-800 bg-[#07090e] text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      Tutor
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-blue-900/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Authenticating...
                </>
              ) : customMode === 'signin' ? (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In with Supabase
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  Create &amp; Sign In
                </>
              )}
            </button>
          </form>
        )}

        {/* Database & Security Architecture specs */}
        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            Database &amp; Security Specs
          </div>
          <p className="text-[10px] leading-relaxed text-slate-500 font-mono">
            Host: db.bturhosivfvyvanztkjb.supabase.co:5432 · PostgreSQL 17.11<br />
            Auth: Supabase GoTrue with JWT RS256/ES256 verification<br />
            RLS: Row Level Security enabled on profiles, sessions, drills, attempts
          </p>
        </div>

        <div className="pt-1 flex items-center justify-between">
          <button
            onClick={signOut}
            className="text-xs text-rose-400 hover:text-rose-300 underline"
          >
            Sign Out
          </button>
          <button
            onClick={closeAuthModal}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
