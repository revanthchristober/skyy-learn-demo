import React from 'react';
import { X, Shield, User, GraduationCap, CheckCircle2, Database, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    user, 
    activeRole, 
    signInAsTutor, 
    signInAsLearner, 
    signOut,
    session 
  } = useAuth();

  if (!isAuthModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b0e14] border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-4">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Supabase Auth &amp; Role Switcher
            </h2>
            <p className="text-xs text-slate-400">
              Live GoTrue JWT authentication with PostgreSQL RLS profiles
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

        {/* Persona quick switch buttons */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-slate-300 block">
            Select Active User / Role
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

        {/* Database & Security Architecture specs */}
        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
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
