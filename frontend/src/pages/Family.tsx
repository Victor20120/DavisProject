import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  onFamilyChanged,
  removeFamilyMember,
  onMedsChanged,
  onInvitesChanged,
  createInvitation,
  type FamilyMember,
  type Invitation,
} from '../database/firestore';
import type { MedData } from '../types';

const AVATAR_COLORS = ['#378ADD', '#185FA5', '#0C447C', '#2563EB'];

type FirestoreMed = MedData & { notes: string; reminderTime: string; lastTakenDate?: string };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmt12(hhmm: string) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export default function Family() {
  const { user } = useAuth();
  const [members, setMembers]       = useState<FamilyMember[]>([]);
  const [meds, setMeds]             = useState<FirestoreMed[]>([]);
  const [invites, setInvites]       = useState<Invitation[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery]           = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubFamily  = onFamilyChanged(user.uid, setMembers);
    const unsubMeds    = onMedsChanged(user.uid, meds => setMeds(meds as FirestoreMed[]));
    const unsubInvites = onInvitesChanged(user.uid, setInvites);
    return () => { unsubFamily(); unsubMeds(); unsubInvites(); };
  }, [user]);

  async function handleRemove(id: string) {
    if (user) await removeFamilyMember(user.uid, id).catch(() => {});
  }

  const pendingInvites  = invites.filter(i => i.status === 'pending');
  const acceptedMembers = members;

  const displayName = user?.displayName ?? 'You';
  const today = todayStr();

  const medsWithReminders = meds.filter(m => m.reminderTime);

  const filteredMembers = query.trim()
    ? acceptedMembers.filter(m =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.relation.toLowerCase().includes(query.toLowerCase())
      )
    : acceptedMembers;

  return (
    <div className="min-h-screen pb-24 lg:pb-8 px-4 pt-10 lg:pt-12" style={{ backgroundColor: '#F5F8FF' }}>
      <div className="w-full max-w-[520px] mx-auto">

        <header className="mb-8 text-center">
          <h1 className="text-[32px] font-bold tracking-tight" style={{ color: '#0C447C' }}>
            Family Loop
          </h1>
        </header>

        {/* Today's status card */}
        <section className="mb-6">
          <h2 className="text-[15px] font-semibold mb-3" style={{ color: '#0C447C' }}>Today's status</h2>
          <div className="rounded-[20px] p-5 text-white" style={{ backgroundColor: '#185FA5' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[16px] font-bold">{displayName}'s medications</p>
              <span
                className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            {medsWithReminders.length === 0 ? (
              <p className="text-[14px]" style={{ opacity: 0.7 }}>No reminders set yet</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {medsWithReminders.map(med => {
                  const taken = med.lastTakenDate === today;
                  return (
                    <div key={med.generic_name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{ backgroundColor: taken ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)' }}
                        >
                          {taken ? '✓' : '○'}
                        </span>
                        <span className="text-[14px]" style={{ opacity: taken ? 1 : 0.65 }}>
                          {med.generic_name} {med.dosage}
                        </span>
                      </div>
                      <span className="text-[13px]" style={{ opacity: 0.65 }}>
                        {taken ? 'Taken' : fmt12(med.reminderTime)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[15px] font-semibold mb-3" style={{ color: '#0C447C' }}>
              Pending invites
            </h2>
            <div className="flex flex-col gap-3">
              {pendingInvites.map(inv => (
                <PendingCard
                  key={inv.token}
                  invite={inv}
                  onCopy={() => {
                    const link = `${window.location.origin}/join/${inv.token}`;
                    navigator.clipboard.writeText(link).catch(() => {});
                    setCopiedToken(inv.token);
                    setTimeout(() => setCopiedToken(null), 2000);
                  }}
                  copied={copiedToken === inv.token}
                />
              ))}
            </div>
          </section>
        )}

        {/* Members section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-bold" style={{ color: '#0C447C' }}>Members</h2>
              <span
                className="text-[13px] font-bold px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: '#EFF6FF', color: '#185FA5' }}
              >
                {acceptedMembers.length + 1}
              </span>
            </div>
            <button
              type="button"
              onClick={() => { setShowSearch(v => !v); setQuery(''); }}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: showSearch ? '#185FA5' : '#EFF6FF' }}
            >
              {showSearch ? <XIcon /> : <SearchIcon />}
            </button>
          </div>

          <div
            style={{
              overflow: 'hidden',
              maxHeight: showSearch ? '64px' : '0px',
              opacity: showSearch ? 1 : 0,
              transition: 'max-height 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease',
              marginBottom: showSearch ? '12px' : '0px',
            }}
          >
            <div
              className="flex items-center gap-3 px-4 rounded-[14px]"
              style={{ backgroundColor: '#fff', border: '1.5px solid #D6E4F7', height: 48 }}
            >
              <SearchIcon faint />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search members…"
                className="flex-1 text-[15px] outline-none bg-transparent"
                style={{ color: '#0C447C', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* You (always first) */}
            <MemberCard
              name={displayName}
              relation="You"
              color="#378ADD"
              isYou
            />
            {filteredMembers.map((m, i) => (
              <MemberCard
                key={m.id}
                name={m.name}
                relation={m.relation}
                color={AVATAR_COLORS[(i + 1) % AVATAR_COLORS.length]}
                onRemove={() => handleRemove(m.id)}
              />
            ))}
            {filteredMembers.length === 0 && query.trim() && (
              <div
                className="rounded-[20px] px-5 py-10 text-center"
                style={{ backgroundColor: '#fff', border: '0.5px solid #D6E4F7' }}
              >
                <p className="text-[15px] font-medium" style={{ color: '#94A3B8' }}>
                  No members match "{query}"
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Invite button */}
        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          className="mt-6 w-full font-semibold text-[16px] flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          style={{
            minHeight: 52,
            borderRadius: 100,
            border: '1.5px solid #185FA5',
            color: '#185FA5',
            backgroundColor: '#fff',
          }}
        >
          <PlusIcon />
          Invite a family member
        </button>
      </div>

      {/* Invite modal */}
      {showInviteModal && (
        <InviteModal
          user={user}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}

// ─── Pending invite card ──────────────────────────────────────────────────────

function PendingCard({ invite, onCopy, copied }: {
  invite: Invitation;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div
      className="bg-white flex items-center gap-4 px-4 py-3.5"
      style={{ borderRadius: 20, border: '0.5px solid #D6E4F7' }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-[18px] text-white shrink-0"
        style={{ backgroundColor: '#D6E4F7' }}
      >
        <span style={{ color: '#378ADD' }}>{invite.name[0]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[16px] font-bold leading-tight" style={{ color: '#0C447C' }}>{invite.name}</p>
        <p className="text-[13px]" style={{ color: '#378ADD' }}>{invite.relation}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: '#FFFBEB', color: '#92400E' }}
        >
          Pending
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="text-[12px] font-semibold px-3 py-1 rounded-full transition-all"
          style={{
            backgroundColor: copied ? '#F0FDF4' : '#EFF6FF',
            color: copied ? '#16A34A' : '#185FA5',
          }}
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}

// ─── Member card ──────────────────────────────────────────────────────────────

function MemberCard({ name, relation, color, isYou, onRemove }: {
  name: string;
  relation: string;
  color: string;
  isYou?: boolean;
  onRemove?: () => void;
}) {
  return (
    <div
      className="bg-white flex items-center gap-4 px-4 py-3.5"
      style={{ borderRadius: 20, border: '0.5px solid #D6E4F7', boxShadow: '0 1px 8px rgba(12,68,124,0.06)' }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-[18px] text-white shrink-0"
        style={{ backgroundColor: color }}
      >
        {name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[16px] font-bold leading-tight truncate" style={{ color: '#0C447C' }}>{name}</p>
        <p className="text-[13px] mt-0.5" style={{ color: '#378ADD' }}>{relation}</p>
      </div>
      {isYou ? (
        <span
          className="text-[12px] font-semibold px-2.5 py-1 rounded-full shrink-0"
          style={{ backgroundColor: '#EFF6FF', color: '#185FA5' }}
        >
          You
        </span>
      ) : (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-[13px] font-semibold px-3 py-1.5 rounded-full active:scale-95"
          style={{ border: '1px solid #FECACA', color: '#DC2626', backgroundColor: '#FEF2F2' }}
        >
          Remove
        </button>
      )}
    </div>
  );
}

// ─── Invite modal ─────────────────────────────────────────────────────────────

function InviteModal({ user, onClose }: { user: { uid: string; displayName: string | null } | null; onClose: () => void }) {
  const [name, setName]         = useState('');
  const [relation, setRelation] = useState('');
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [link, setLink]         = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const [emailErr, setEmailErr] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  async function handleInvite() {
    if (!user || !name.trim() || !relation.trim()) return;
    setLoading(true);
    setEmailErr('');
    try {
      const inviterName = user.displayName ?? 'Someone';
      const token = await createInvitation(user.uid, inviterName, {
        name: name.trim(),
        relation: relation.trim(),
        phone: '',
      });
      const joinLink = `${window.location.origin}/join/${token}`;
      setLink(joinLink);

      // Send email invite if address provided
      if (email.trim()) {
        const resp = await fetch('http://localhost:8000/family/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_email: email.trim(),
            to_name: name.trim(),
            relation: relation.trim(),
            inviter_name: inviterName,
            join_link: joinLink,
          }),
        });
        const data = await resp.json();
        if (data.ok) {
          setSent(true);
        } else {
          setEmailErr('Email could not be sent — use the link below instead.');
        }
      }
    } catch {
      setEmailErr('Something went wrong. Copy the link below to share manually.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!link) return;
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-8 sm:pb-0"
      style={{ backgroundColor: 'rgba(12,68,124,0.35)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="w-full max-w-[440px] bg-white rounded-[24px] p-6"
        style={{ border: '0.5px solid #D6E4F7', boxShadow: '0 20px 60px rgba(12,68,124,0.18)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[20px] font-bold" style={{ color: '#0C447C' }}>Invite to Family Loop</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F5F8FF' }}>
            <XIcon />
          </button>
        </div>

        {!link ? (
          <>
            <div className="flex flex-col gap-3 mb-5">
              <Field label="Name" value={name} onChange={setName} placeholder="e.g. Sarah" />
              <Field label="Relation" value={relation} onChange={setRelation} placeholder="e.g. Daughter, Son, Caregiver" />
              <Field label="Email (to send invite link)" value={email} onChange={setEmail} placeholder="e.g. sarah@example.com" type="email" />
            </div>
            <button
              type="button"
              onClick={handleInvite}
              disabled={!name.trim() || !relation.trim() || loading}
              className="w-full font-semibold text-[16px] text-white transition-transform active:scale-[0.98] disabled:opacity-50"
              style={{ minHeight: 52, borderRadius: 100, backgroundColor: '#185FA5' }}
            >
              {loading ? 'Sending invite…' : email.trim() ? 'Send invite email' : 'Create invite link'}
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-4">
            {sent ? (
              <div className="flex items-center gap-3 rounded-[14px] px-4 py-3" style={{ backgroundColor: '#F0FDF4', border: '1px solid #4ADE80' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="9" fill="#4ADE80" />
                  <path d="M6 10L8.5 12.5L14 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-[14px] font-semibold" style={{ color: '#16A34A' }}>Invite sent to {email}</p>
              </div>
            ) : (
              <p className="text-[14px]" style={{ color: '#378ADD' }}>
                Share this link with <strong>{name}</strong>. They'll tap Accept to join.
              </p>
            )}

            {emailErr && (
              <p className="text-[13px] font-medium" style={{ color: '#DC2626' }}>{emailErr}</p>
            )}

            <div
              className="rounded-[14px] px-4 py-3 text-[13px] font-mono break-all"
              style={{ backgroundColor: '#F5F8FF', color: '#0C447C', border: '1px dashed #D6E4F7' }}
            >
              {link}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="w-full font-semibold text-[16px] text-white transition-transform active:scale-[0.98]"
              style={{ minHeight: 52, borderRadius: 100, backgroundColor: copied ? '#16A34A' : '#185FA5' }}
            >
              {copied ? 'Copied to clipboard!' : 'Copy link'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-[14px] font-semibold text-center"
              style={{ color: '#94A3B8' }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-[13px] font-semibold mb-1" style={{ color: '#378ADD' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[12px] px-4 outline-none text-[15px]"
        style={{
          height: 48,
          backgroundColor: '#F5F8FF',
          border: '1px solid #D6E4F7',
          color: '#0C447C',
          fontFamily: 'inherit',
        }}
      />
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon({ faint }: { faint?: boolean }) {
  const c = faint ? '#CBD5E1' : '#185FA5';
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <circle cx="7.5" cy="7.5" r="5.5" stroke={c} strokeWidth="1.6" />
      <path d="M12 12L15 15" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 2L11 11M11 2L2 11" stroke="#94A3B8" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 3V15M3 9H15" stroke="#185FA5" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
