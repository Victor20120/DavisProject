import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getInvitation, acceptInvitation, declineInvitation, storeFamilyPushSubscription, type Invitation } from '../database/firestore';

type PageState = 'loading' | 'found' | 'accepting' | 'accepted' | 'declined' | 'already_responded' | 'not_found' | 'error';

export default function JoinFamily() {
  const { token } = useParams<{ token: string }>();
  const [invite, setInvite]       = useState<Invitation | null>(null);
  const [state, setState]         = useState<PageState>('loading');
  const [pushGranted, setPushGranted] = useState(false);

  useEffect(() => {
    if (!token) { setState('not_found'); return; }
    getInvitation(token)
      .then(inv => {
        if (!inv) { setState('not_found'); return; }
        if (inv.status === 'accepted') { setState('already_responded'); setInvite(inv); return; }
        if (inv.status === 'declined') { setState('already_responded'); setInvite(inv); return; }
        setInvite(inv);
        setState('found');
      })
      .catch(() => setState('error'));
  }, [token]);

  async function requestPushAndStore(inviterUid: string, token: string) {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
      await storeFamilyPushSubscription(inviterUid, token, sub.toJSON());
      setPushGranted(true);
    } catch {
      // push is best-effort
    }
  }

  async function handleAccept() {
    if (!invite || !token) return;
    setState('accepting');
    try {
      await acceptInvitation(token, invite.inviterUid, invite.name, invite.relation);
      await requestPushAndStore(invite.inviterUid, token);
      setState('accepted');
    } catch {
      setState('error');
    }
  }

  async function handleDecline() {
    if (!invite || !token) return;
    try {
      await declineInvitation(token, invite.inviterUid);
      setState('declined');
    } catch {
      setState('error');
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#F5F8FF' }}
    >
      <div className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <CapsuleIcon />
          <span className="text-[28px] font-bold tracking-tight" style={{ color: '#0C447C' }}>Pal</span>
        </div>

        {state === 'loading' && (
          <Card>
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          </Card>
        )}

        {state === 'not_found' && (
          <Card>
            <p className="text-[18px] font-bold text-center mb-2" style={{ color: '#0C447C' }}>
              Invite not found
            </p>
            <p className="text-[14px] text-center" style={{ color: '#94A3B8' }}>
              This link may have expired or already been used.
            </p>
          </Card>
        )}

        {state === 'error' && (
          <Card>
            <p className="text-[18px] font-bold text-center mb-2" style={{ color: '#DC2626' }}>
              Something went wrong
            </p>
            <p className="text-[14px] text-center" style={{ color: '#94A3B8' }}>
              Please try the link again.
            </p>
          </Card>
        )}

        {(state === 'found' || state === 'accepting') && invite && (
          <Card>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-[26px] text-white mx-auto mb-4"
              style={{ backgroundColor: '#185FA5' }}
            >
              {invite.inviterName[0]}
            </div>
            <p className="text-[20px] font-bold text-center mb-1" style={{ color: '#0C447C' }}>
              {invite.inviterName} invited you
            </p>
            <p className="text-[14px] text-center mb-6" style={{ color: '#378ADD' }}>
              Join their Family Loop to stay updated on their medications.
            </p>

            <div
              className="rounded-[14px] px-4 py-3 mb-6"
              style={{ backgroundColor: '#EFF6FF', border: '1px solid #D6E4F7' }}
            >
              <div className="flex justify-between items-center">
                <span className="text-[13px]" style={{ color: '#94A3B8' }}>Your name</span>
                <span className="text-[14px] font-semibold" style={{ color: '#0C447C' }}>{invite.name}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[13px]" style={{ color: '#94A3B8' }}>Relation</span>
                <span className="text-[14px] font-semibold" style={{ color: '#0C447C' }}>{invite.relation}</span>
              </div>
            </div>

            <p className="text-[12px] text-center mb-4" style={{ color: '#94A3B8' }}>
              Accepting will allow you to receive medication reminders for {invite.inviterName}.
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleAccept}
                disabled={state === 'accepting'}
                className="w-full font-semibold text-[16px] text-white disabled:opacity-60 transition-transform active:scale-[0.98]"
                style={{ minHeight: 52, borderRadius: 100, backgroundColor: '#185FA5' }}
              >
                {state === 'accepting' ? 'Joining…' : 'Accept and join'}
              </button>
              <button
                type="button"
                onClick={handleDecline}
                disabled={state === 'accepting'}
                className="w-full font-semibold text-[15px] disabled:opacity-60"
                style={{ minHeight: 44, color: '#94A3B8' }}
              >
                Decline
              </button>
            </div>
          </Card>
        )}

        {state === 'accepted' && invite && (
          <Card>
            <div className="flex items-center justify-center mb-4">
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <circle cx="26" cy="26" r="24" fill="#F0FDF4" stroke="#4ADE80" strokeWidth="2" />
                <path d="M16 26L22 32L36 18" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-[20px] font-bold text-center mb-2" style={{ color: '#0C447C' }}>
              You're in!
            </p>
            <p className="text-[14px] text-center" style={{ color: '#378ADD' }}>
              You've joined {invite.inviterName}'s Family Loop.
              {pushGranted ? ' You\'ll receive notifications about their medications.' : ' Open Pal to see their medication status.'}
            </p>
          </Card>
        )}

        {state === 'declined' && (
          <Card>
            <p className="text-[18px] font-bold text-center mb-2" style={{ color: '#0C447C' }}>
              Invite declined
            </p>
            <p className="text-[14px] text-center" style={{ color: '#94A3B8' }}>
              You won't receive any notifications. You can ask for a new invite link if you change your mind.
            </p>
          </Card>
        )}

        {state === 'already_responded' && invite && (
          <Card>
            <p className="text-[18px] font-bold text-center mb-2" style={{ color: '#0C447C' }}>
              Already {invite.status}
            </p>
            <p className="text-[14px] text-center" style={{ color: '#94A3B8' }}>
              This invite has already been {invite.status}.
            </p>
          </Card>
        )}

      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-white rounded-[24px] p-7"
      style={{ border: '0.5px solid #D6E4F7', boxShadow: '0 4px 24px rgba(12,68,124,0.08)' }}
    >
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="animate-spin">
      <circle cx="16" cy="16" r="13" stroke="#D6E4F7" strokeWidth="3" />
      <path d="M16 3C9 3 3 9 3 16" stroke="#185FA5" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function CapsuleIcon() {
  return (
    <svg width="22" height="36" viewBox="0 0 24 40" fill="none">
      <path d="M12 1C6.477 1 2 5.477 2 11V20H22V11C22 5.477 17.523 1 12 1Z" fill="#0C447C" />
      <path d="M2 20V29C2 34.523 6.477 39 12 39C17.523 39 22 34.523 22 29V20H2Z" fill="#185FA5" />
      <line x1="2" y1="20" x2="22" y2="20" stroke="white" strokeWidth="1.4" />
    </svg>
  );
}
