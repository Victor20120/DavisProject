import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { onFamilyChanged, removeFamilyMember, seedFamilyData, type FamilyMember } from '../database/firestore';

const AVATAR_COLORS = ['#378ADD', '#185FA5', '#0C447C', '#2563EB'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  relation: string;
  isYou?: boolean;
  avatarColor: string;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Family() {
  const { user }                        = useAuth();
  const [members, setMembers]           = useState<Member[]>([]);
  const [showSearch, setShowSearch]     = useState(false);
  const [query, setQuery]               = useState('');

  useEffect(() => {
    if (!user) return;
    let seeded = false;
    const unsub = onFamilyChanged(user.uid, (firestoreMembers: FamilyMember[]) => {
      if (firestoreMembers.length === 0 && !seeded) {
        seeded = true;
        seedFamilyData(user.uid);
      } else if (firestoreMembers.length > 0) {
        const youMember: Member = {
          id: user.uid,
          name: user.displayName ?? 'You',
          relation: 'You',
          isYou: true,
          avatarColor: '#378ADD',
        };
        const others: Member[] = firestoreMembers.map((m, i) => ({
          id: m.id,
          name: m.name,
          relation: m.relation,
          avatarColor: AVATAR_COLORS[(i + 1) % AVATAR_COLORS.length],
        }));
        setMembers([youMember, ...others]);
      }
    });
    return unsub;
  }, [user]);

  async function removeMember(id: string) {
    if (user) await removeFamilyMember(user.uid, id).catch(() => {});
  }

  function toggleSearch() {
    setShowSearch(v => !v);
    setQuery('');
  }

  const filtered = query.trim()
    ? members.filter(m =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.relation.toLowerCase().includes(query.toLowerCase())
      )
    : members;

  return (
    <div className="min-h-screen pb-24 lg:pb-8 px-4 pt-10 lg:pt-12" style={{ backgroundColor: '#F5F8FF' }}>
      <div className="w-full max-w-[520px] mx-auto">

        {/* Centered title */}
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
              <p className="text-[16px] font-bold">Dorothy's medications</p>
              <span
                className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                May 9
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                { med: 'Lisinopril 10mg', time: '8:05 AM', taken: true },
                { med: 'Metformin 500mg', time: '8:05 AM', taken: true },
                { med: 'Metformin 500mg', time: '8:00 PM', taken: false, label: 'Evening dose' },
              ].map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{ backgroundColor: d.taken ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)' }}
                    >
                      {d.taken ? '✓' : '○'}
                    </span>
                    <span className="text-[14px]" style={{ opacity: d.taken ? 1 : 0.65 }}>
                      {d.label ?? d.med}
                    </span>
                  </div>
                  <span className="text-[13px]" style={{ opacity: 0.65 }}>{d.time}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Members section */}
        <section>

          {/* Row: "Members · N" on left, search icon on right */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-bold" style={{ color: '#0C447C' }}>Members</h2>
              <span
                className="text-[13px] font-bold px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: '#EFF6FF', color: '#185FA5' }}
              >
                {members.length}
              </span>
            </div>

            <button
              type="button"
              onClick={toggleSearch}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-150"
              style={{ backgroundColor: showSearch ? '#185FA5' : '#EFF6FF' }}
              aria-label={showSearch ? 'Close search' : 'Search members'}
            >
              {showSearch ? <XSearchIcon /> : <SearchIcon />}
            </button>
          </div>

          {/* Animated search bar */}
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
                tabIndex={showSearch ? 0 : -1}
              />
              {query.length > 0 && (
                <button type="button" onClick={() => setQuery('')} className="shrink-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2L12 12M12 2L2 12" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Member cards */}
          <div className="flex flex-col gap-3">
            {filtered.length === 0 ? (
              <div
                className="rounded-[20px] px-5 py-10 text-center"
                style={{ backgroundColor: '#fff', border: '0.5px solid #D6E4F7' }}
              >
                <p className="text-[15px] font-medium" style={{ color: '#94A3B8' }}>
                  No members match "{query}"
                </p>
              </div>
            ) : (
              filtered.map(member => (
                <MemberCard
                  key={member.id}
                  member={member}
                  onRemove={() => removeMember(member.id)}
                />
              ))
            )}
          </div>
        </section>

        {/* Invite button */}
        <button
          type="button"
          className="mt-6 w-full font-semibold text-[16px] flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          style={{
            minHeight: 52,
            borderRadius: 100,
            border: '1.5px solid #185FA5',
            color: '#185FA5',
            backgroundColor: '#fff',
          }}
          onClick={() => console.log('[Pill Pal] Invite family member')}
        >
          <PlusIcon />
          Invite
        </button>

      </div>
    </div>
  );
}

// ─── Member card ──────────────────────────────────────────────────────────────

function MemberCard({ member, onRemove }: { member: Member; onRemove: () => void }) {
  return (
    <div
      className="bg-white flex items-center gap-4 px-4 py-3.5"
      style={{
        borderRadius: 20,
        border: '0.5px solid #D6E4F7',
        boxShadow: '0 1px 8px rgba(12,68,124,0.06)',
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-[18px] text-white shrink-0"
        style={{ backgroundColor: member.avatarColor }}
      >
        {member.name[0]}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[16px] font-bold leading-tight truncate" style={{ color: '#0C447C' }}>
          {member.name}
        </p>
        <p className="text-[13px] mt-0.5" style={{ color: '#378ADD' }}>
          {member.relation}
        </p>
      </div>

      {member.isYou ? (
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
          className="shrink-0 text-[13px] font-semibold px-3 py-1.5 rounded-full transition-all duration-150 active:scale-95"
          style={{ border: '1px solid #FECACA', color: '#DC2626', backgroundColor: '#FEF2F2' }}
        >
          Remove
        </button>
      )}
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

function XSearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 2L11 11M11 2L2 11" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
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
