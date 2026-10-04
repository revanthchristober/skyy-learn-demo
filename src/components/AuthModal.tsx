import React, { useState } from 'react';
import { XIcon } from '@phosphor-icons/react';
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

  const tabClass = (on: boolean) =>
    `-mb-px border-b-2 px-1 pb-2 text-sm transition-colors ${
      on ? 'border-accent font-medium text-ink' : 'border-transparent text-muted hover:text-ink'
    }`;

  const personaClass = (on: boolean) =>
    `w-full rounded-md border px-4 py-3 text-left transition-colors ${
      on ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-[#cfccc4]'
    }`;

  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="dialog max-w-md">
        <button onClick={closeAuthModal} aria-label="Close" className="btn btn-quiet absolute right-3 top-3 !px-2">
          <XIcon size={14} />
        </button>

        <h2 id="auth-title" className="text-lg font-semibold">Account</h2>
        <p className="mt-1 text-muted">
          {user ? (
            <>
              Signed in as <span className="font-medium text-ink">{user.fullName}</span>, {activeRole}
              {session ? '' : ' (demo)'}
            </>
          ) : (
            'Not signed in.'
          )}
        </p>

        <div className="mt-5 flex gap-5 border-b border-line">
          <button onClick={() => { setActiveTab('personas'); setFormError(null); }} className={tabClass(activeTab === 'personas')}>
            Demo accounts
          </button>
          <button onClick={() => { setActiveTab('custom'); setFormError(null); }} className={tabClass(activeTab === 'custom')}>
            Email and password
          </button>
        </div>

        {activeTab === 'personas' ? (
          <div className="mt-5 space-y-2">
            <button onClick={signInAsTutor} className={personaClass(activeRole === 'tutor')}>
              <div className="font-medium text-ink">Dakota Munro, tutor</div>
              <p className="mt-0.5 text-sm text-muted">Write notes, review questions, approve sets.</p>
              <p className="mt-1 font-mono text-[13px] text-muted">dakota.munro.tutor@gmail.com</p>
            </button>
            <button onClick={signInAsLearner} className={personaClass(activeRole === 'learner')}>
              <div className="font-medium text-ink">Marcus Vance, learner</div>
              <p className="mt-0.5 text-sm text-muted">Answer questions, flag anything confusing.</p>
              <p className="mt-1 font-mono text-[13px] text-muted">marcus.vance@gmail.com</p>
            </button>
          </div>
        ) : (
          <form onSubmit={handleCustomSubmit} className="mt-5 space-y-4">
            {formError && (
              <p role="alert" className="notice notice-bad">{formError}</p>
            )}

            {customMode === 'signup' && (
              <>
                <div>
                  <label htmlFor="auth-name" className="field-label">Full name</label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="input"
                  />
                </div>
                <fieldset>
                  <legend className="field-label">I am a</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(['learner', 'tutor'] as const).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        aria-pressed={role === r}
                        className={`rounded-md border px-3 py-2 text-sm capitalize transition-colors ${
                          role === r
                            ? 'border-accent bg-accent-soft font-medium text-ink'
                            : 'border-line bg-surface text-muted hover:text-ink'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            <div>
              <label htmlFor="auth-email" className="field-label">Email</label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="field-label">Password</label>
              <input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
              {isSubmitting ? 'Working...' : customMode === 'signin' ? 'Sign in' : 'Create account'}
            </button>

            <button
              type="button"
              onClick={() => {
                setCustomMode(customMode === 'signin' ? 'signup' : 'signin');
                setFormError(null);
              }}
              className="w-full text-center text-sm text-muted hover:text-ink"
            >
              {customMode === 'signin' ? 'No account yet? Create one' : 'Have an account? Sign in'}
            </button>
          </form>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
          <button onClick={signOut} className="btn btn-quiet -ml-2">Sign out</button>
          <button onClick={closeAuthModal} className="btn">Close</button>
        </div>
      </div>
    </div>
  );
};
