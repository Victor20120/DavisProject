import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, signUp, resetPassword } from '../database/auth';
import { saveUserProfile } from '../database/firestore';

type Mode = 'login' | 'signup';

export default function Login() {
  const navigate          = useNavigate();
  const [mode, setMode]   = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [name, setName]   = useState('');
  const [pass, setPass]   = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email, pass);
      } else {
        const user = await signUp(email, pass, name);
        await saveUserProfile(user.uid, { displayName: name, email });
      }
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(friendlyError(msg));
    } finally {
      setBusy(false);
    }
  }

  function toggle() {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setError('');
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#F0F4FF' }}
    >
      <div
        className="w-full max-w-[400px] bg-white px-8 py-10"
        style={{ borderRadius: 28, boxShadow: '0 4px 40px rgba(12,68,124,0.10)' }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-2">
            <PillLogo />
            <span
              className="text-[36px] font-bold tracking-[-1.5px]"
              style={{ color: '#0C447C', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              Pal
            </span>
          </div>
          <p className="text-[15px]" style={{ color: '#93C5FD' }}>
            Your medication, simplified.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <Field
              label="Full Name"
              type="text"
              value={name}
              onChange={setName}
              placeholder="Dorothy Mitchell"
              autoComplete="name"
            />
          )}

          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@email.com"
            autoComplete="email"
          />

          <Field
            label="Password"
            type="password"
            value={pass}
            onChange={setPass}
            placeholder="••••••••••"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {error && (
            <p className="text-[13px] text-center font-medium" style={{ color: '#DC2626' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full font-bold text-[16px] transition-all active:scale-[0.98] disabled:opacity-60 mt-1"
            style={{
              minHeight: 52,
              borderRadius: 14,
              border: '1.5px solid #CBD5E1',
              backgroundColor: '#fff',
              color: '#0D1117',
            }}
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1" style={{ height: '1px', backgroundColor: '#E2E8F0' }} />
          <span className="text-[13px]" style={{ color: '#94A3B8' }}>or</span>
          <div className="flex-1" style={{ height: '1px', backgroundColor: '#E2E8F0' }} />
        </div>

        <button
          type="button"
          onClick={toggle}
          className="w-full font-bold text-[16px] transition-all active:scale-[0.98]"
          style={{
            minHeight: 52,
            borderRadius: 14,
            border: '1.5px solid #CBD5E1',
            backgroundColor: '#fff',
            color: '#0D1117',
          }}
        >
          {mode === 'login' ? 'Create an account' : 'Back to log in'}
        </button>

        {mode === 'login' && (
          <div className="text-center mt-4">
            <button
              type="button"
              className="text-[14px] font-medium underline"
              style={{ color: '#185FA5' }}
              onClick={async () => {
                if (!email) { setError('Enter your email above first.'); return; }
                try {
                  await resetPassword(email);
                  setError('');
                  alert(`Reset email sent to ${email}`);
                } catch {
                  setError('Could not send reset email. Check the address and try again.');
                }
              }}
            >
              Forgot your password?
            </button>
          </div>
        )}

        {/* HIPAA badge */}
        <div className="flex items-center justify-center gap-2 mt-8">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="7" width="12" height="8" rx="2" stroke="#93C5FD" strokeWidth="1.4" />
            <path d="M5 7V5a3 3 0 116 0v2" stroke="#93C5FD" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="text-[13px] font-medium" style={{ color: '#93C5FD' }}>
            Secure &amp; HIPAA-compliant
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label, type, value, onChange, placeholder, autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[15px] font-bold" style={{ color: '#0C447C' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="w-full outline-none text-[15px] px-4"
        style={{
          height: 52,
          borderRadius: 12,
          border: '1.5px solid #CBD5E1',
          color: '#0D1117',
          fontFamily: 'inherit',
          caretColor: '#185FA5',
        }}
        onFocus={e => (e.currentTarget.style.border = '1.5px solid #185FA5')}
        onBlur={e  => (e.currentTarget.style.border = '1.5px solid #CBD5E1')}
      />
    </div>
  );
}

function PillLogo() {
  return (
    <svg width="40" height="48" viewBox="0 0 40 48" fill="none">
      <rect x="4" y="0" width="32" height="48" rx="16" fill="#378ADD" />
      <rect x="4" y="0" width="32" height="24" rx="16" fill="#0C447C" />
    </svg>
  );
}

// ─── Friendly Firebase error messages ─────────────────────────────────────────

function friendlyError(msg: string): string {
  if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential'))
    return 'Incorrect email or password.';
  if (msg.includes('email-already-in-use'))
    return 'An account with that email already exists.';
  if (msg.includes('weak-password'))
    return 'Password must be at least 6 characters.';
  if (msg.includes('invalid-email'))
    return 'Please enter a valid email address.';
  if (msg.includes('network-request-failed'))
    return 'No internet connection. Please try again.';
  return 'Something went wrong. Please try again.';
}
