// ─── Types ───────────────────────────────────────────────────────────────────

type DoseStatus = 'on_track' | 'missed' | 'upcoming' | 'watching';

interface Member {
  id: string;
  name: string;
  relation: string;
  isYou?: boolean;
  status: DoseStatus;
  statusText: string;
  time: string;
  meds: string[];
  avatarColor: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_MEMBERS: Member[] = [
  {
    id: '1',
    name: 'Dorothy',
    relation: 'You',
    isYou: true,
    status: 'on_track',
    statusText: 'Took morning dose',
    time: '8:05 AM',
    meds: ['Lisinopril 10mg', 'Metformin 500mg'],
    avatarColor: '#378ADD',
  },
  {
    id: '2',
    name: 'Sarah',
    relation: 'Daughter',
    status: 'watching',
    statusText: 'Watching · Online now',
    time: 'Last active 2m ago',
    meds: ['Watching your medications'],
    avatarColor: '#185FA5',
  },
  {
    id: '3',
    name: 'James',
    relation: 'Son',
    status: 'watching',
    statusText: 'Watching · Online now',
    time: 'Last active 5m ago',
    meds: ['Watching your medications'],
    avatarColor: '#0C447C',
  },
];

const STATUS_CONFIG: Record<DoseStatus, { dot: string; label: string; labelColor: string }> = {
  on_track: { dot: '#16A34A', label: '✓',  labelColor: '#16A34A' },
  missed:   { dot: '#DC2626', label: '⚠',  labelColor: '#DC2626' },
  upcoming: { dot: '#D97706', label: '○',  labelColor: '#D97706' },
  watching: { dot: '#16A34A', label: '●', labelColor: '#16A34A' },
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Family() {
  const missedCount = MOCK_MEMBERS.filter(m => m.status === 'missed').length;

  return (
    <div className="min-h-screen pb-24 lg:pb-8 px-4 pt-10 lg:pt-12" style={{ backgroundColor: '#F5F8FF' }}>

      {/* Header */}
      <header className="mb-6">
        <h1 className="text-[24px] font-bold" style={{ color: '#0C447C' }}>Family Loop</h1>
        <p className="text-[14px] mt-1" style={{ color: '#378ADD' }}>
          {MOCK_MEMBERS.length} members connected
        </p>
      </header>

      {/* Missed dose alert */}
      {missedCount > 0 && (
        <div className="rounded-[16px] p-4 mb-5 flex items-start gap-3"
          style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }}>
          <span className="text-[20px]">⚠</span>
          <div>
            <p className="text-[15px] font-bold" style={{ color: '#7F1D1D' }}>Missed dose detected</p>
            <p className="text-[14px] mt-0.5" style={{ color: '#991B1B' }}>
              {missedCount} family member{missedCount > 1 ? 's have' : ' has'} missed a dose today.
            </p>
          </div>
        </div>
      )}

      {/* Today's status summary */}
      <section className="mb-6">
        <h2 className="text-[15px] font-semibold mb-3" style={{ color: '#0C447C' }}>Today's status</h2>
        <div className="rounded-[20px] p-5 text-white" style={{ backgroundColor: '#185FA5' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[16px] font-bold">Dorothy's medications</p>
            <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              May 9
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { med: 'Lisinopril 10mg',  time: '8:05 AM',  taken: true },
              { med: 'Metformin 500mg',  time: '8:05 AM',  taken: true },
              { med: 'Metformin 500mg',  time: '8:00 PM',  taken: false, label: 'Evening dose' },
            ].map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">{d.taken ? '✓' : '○'}</span>
                  <span className="text-[14px] opacity-90">{d.label ?? d.med}</span>
                </div>
                <span className="text-[13px] opacity-70">{d.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Member list */}
      <section>
        <h2 className="text-[15px] font-semibold mb-3" style={{ color: '#0C447C' }}>Members</h2>
        <div className="flex flex-col gap-3">
          {MOCK_MEMBERS.map(member => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      </section>

      {/* Invite button */}
      <button
        type="button"
        className="mt-5 w-full font-semibold text-[16px] flex items-center justify-center gap-2"
        style={{
          minHeight: '52px',
          borderRadius: '100px',
          border: '1.5px solid #185FA5',
          color: '#185FA5',
          backgroundColor: 'white',
        }}
        onClick={() => console.log('[Pill Pal] Invite family member')}
      >
        <PlusIcon /> Invite a family member
      </button>
    </div>
  );
}

// ─── Member card ─────────────────────────────────────────────────────────────

function MemberCard({ member }: { member: Member }) {
  const cfg = STATUS_CONFIG[member.status];
  return (
    <div className="bg-white rounded-[20px] p-4 flex items-center gap-4"
      style={{ border: '0.5px solid #D6E4F7' }}>

      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-[18px] text-white"
          style={{ backgroundColor: member.avatarColor }}>
          {member.name[0]}
        </div>
        {/* Online dot */}
        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white"
          style={{ backgroundColor: cfg.dot }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[16px] font-bold truncate" style={{ color: '#0C447C' }}>
            {member.name}
          </p>
          {member.isYou && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
              style={{ backgroundColor: '#EFF6FF', color: '#185FA5' }}>You</span>
          )}
        </div>
        <p className="text-[13px]" style={{ color: cfg.labelColor }}>
          {member.statusText}
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: '#9CA3AF' }}>{member.time}</p>
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <line x1="9" y1="3" x2="9" y2="15" stroke="#185FA5" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="3" y1="9" x2="15" y2="9" stroke="#185FA5" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
