import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from '../database/auth';
import { useAuth } from '../contexts/AuthContext';
import { saveAllReminders, loadAllReminders } from '../database/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReminderEntry {
  enabled: boolean;
  times: string[];
  frequency: string;
}

type ReminderMap = Record<string, ReminderEntry>;

// ─── Meds (mirrors Medications page mock data) ────────────────────────────────

const MEDS = [
  { common_name: 'Blood Pressure Pill', generic_name: 'Lisinopril', dosage: '10mg',  defaultFrequency: 'Once daily',  defaultTimes: ['08:00'] },
  { common_name: 'Pain Reliever',       generic_name: 'Ibuprofen',  dosage: '400mg', defaultFrequency: 'As needed',   defaultTimes: ['09:00'] },
  { common_name: 'Diabetes Pill',       generic_name: 'Metformin',  dosage: '500mg', defaultFrequency: 'Twice daily', defaultTimes: ['08:00', '20:00'] },
];

const CARD_COLORS = ['#0C447C', '#185FA5', '#2563EB'];

const DEFAULTS: ReminderMap = {
  Lisinopril: { enabled: true,  times: ['08:00'],          frequency: 'Once daily'  },
  Ibuprofen:  { enabled: false, times: ['09:00'],          frequency: 'As needed'   },
  Metformin:  { enabled: true,  times: ['08:00', '20:00'], frequency: 'Twice daily' },
};

const DOSE_LABELS = ['Morning', 'Midday', 'Evening', 'Night'];

// ─── Storage ─────────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nowHHMM() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function fmt12(hhmm: string) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Settings() {
  const { user }                         = useAuth();
  const [reminders, setReminders]       = useState<ReminderMap>(DEFAULTS);
  const [openIndex, setOpenIndex]       = useState<number | null>(null);
  const [editIndex, setEditIndex]       = useState<number | null>(null);
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    loadAllReminders(user.uid).then(data => {
      if (data) setReminders(data as ReminderMap);
    }).catch(() => {});
  }, [user]);

  function update(genericName: string, patch: Partial<ReminderEntry>) {
    setReminders(prev => {
      const next = { ...prev, [genericName]: { ...prev[genericName], ...patch } };
      if (user) saveAllReminders(user.uid, next).catch(() => {});
      return next;
    });
  }

  function setTime(genericName: string, index: number, value: string) {
    const times = [...(reminders[genericName]?.times ?? [])];
    times[index] = value;
    update(genericName, { times });
  }

  function addTime(genericName: string) {
    const times = [...(reminders[genericName]?.times ?? []), nowHHMM()];
    update(genericName, { times });
  }

  function removeTime(genericName: string, index: number) {
    const times = (reminders[genericName]?.times ?? []).filter((_, i) => i !== index);
    if (times.length === 0) return;
    update(genericName, { times });
  }

  function closeCard() {
    setOpenIndex(null);
    setEditIndex(null);
  }

  const enabledCount = MEDS.filter(m => reminders[m.generic_name]?.enabled).length;

  return (
    <div className="min-h-screen pb-24 lg:pb-8 px-4 pt-10 lg:pt-12" style={{ backgroundColor: '#F5F8FF' }}>
      <div className="w-full max-w-[520px] mx-auto">

        {/* Header */}
        <header className="mb-6">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[24px] font-bold" style={{ color: '#0C447C' }}>Reminders</h1>
              <p className="text-[14px] mt-0.5" style={{ color: '#378ADD' }}>
                {enabledCount} of {MEDS.length} reminders active
              </p>
            </div>
            <span className="text-[28px] font-bold mb-0.5" style={{ color: '#D6E4F7' }}>
              {enabledCount}
            </span>
          </div>
        </header>

        {/* Cards */}
        <div className="flex flex-col gap-3">
          {MEDS.map((med, i) => {
            const r         = reminders[med.generic_name] ?? DEFAULTS[med.generic_name];
            const isOpen    = openIndex === i;
            const isEditing = editIndex === i;
            const isPressed = pressedIndex === i;
            const color     = CARD_COLORS[i % CARD_COLORS.length];

            return (
              <div
                key={med.generic_name}
                className="overflow-hidden"
                style={{
                  borderRadius: 22,
                  boxShadow: isOpen
                    ? '0 8px 32px rgba(12,68,124,0.20)'
                    : `0 2px 14px rgba(12,68,124,${0.12 - i * 0.02})`,
                  transform: isPressed && !isOpen ? 'scale(0.975)' : 'scale(1)',
                  transition: 'transform 0.08s ease, box-shadow 0.3s ease',
                }}
                onPointerDown={() => { if (!isOpen) setPressedIndex(i); }}
                onPointerUp={() => setPressedIndex(null)}
                onPointerLeave={() => setPressedIndex(null)}
                onPointerCancel={() => setPressedIndex(null)}
              >
                {/* Colored header */}
                <div
                  className="flex items-center gap-3 px-4 select-none"
                  style={{
                    backgroundColor: color,
                    height: 72,
                    cursor: isEditing ? 'default' : 'pointer',
                  }}
                  onClick={() => {
                    if (isEditing) return;
                    setOpenIndex(prev => prev === i ? null : i);
                    setEditIndex(null);
                    setPressedIndex(null);
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                  >
                    <BellIconWhite />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-[16px] leading-tight truncate">{med.common_name}</p>
                    <p className="text-[13px] truncate" style={{ color: 'rgba(255,255,255,0.72)' }}>
                      {med.generic_name} · {r.frequency}
                    </p>
                  </div>
                  {isOpen ? (
                    <div className="flex items-center gap-2 shrink-0">
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setEditIndex(i); }}
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                        >
                          <PencilIcon />
                        </button>
                      )}
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setEditIndex(null); }}
                          className="px-3 h-7 rounded-full text-[12px] font-bold flex items-center"
                          style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: color }}
                        >
                          Done
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); closeCard(); }}
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 2L10 10M10 2L2 10" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                      <path d="M7 5L11 9L7 13" stroke="rgba(255,255,255,0.45)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Collapsed body */}
                {!isOpen && (
                  <div
                    className="flex items-center justify-between px-4 bg-white cursor-pointer"
                    style={{ height: 60, borderTop: '0.5px solid rgba(214,228,247,0.6)' }}
                    onClick={() => setOpenIndex(i)}
                  >
                    <div className="flex items-center gap-2.5">
                      <BellMiniIcon color={r.enabled ? color : '#CBD5E1'} />
                      <span className="text-[14px] font-semibold" style={{ color: r.enabled ? '#0C447C' : '#94A3B8' }}>
                        {r.enabled ? r.times.map(t => fmt12(t)).join('  ·  ') : 'No reminder set'}
                      </span>
                    </div>
                    <Toggle on={r.enabled} onChange={() => update(med.generic_name, { enabled: !r.enabled })} />
                  </div>
                )}

                {/* Expanded body */}
                {isOpen && (
                  <div className="bg-white" style={{ borderTop: '0.5px solid rgba(214,228,247,0.6)' }}>

                    {/* Frequency input — edit mode only */}
                    {isEditing && (
                      <div className="px-4 py-3.5" style={{ borderBottom: '0.5px solid #D6E4F7' }}>
                        <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#378ADD' }}>
                          Frequency / instructions
                        </p>
                        <input
                          type="text"
                          value={r.frequency}
                          onChange={e => update(med.generic_name, { frequency: e.target.value })}
                          onClick={e => e.stopPropagation()}
                          onPointerDown={e => e.stopPropagation()}
                          placeholder="e.g. Once daily, Twice daily, As needed…"
                          className="w-full rounded-[12px] px-3 py-2.5 text-[15px] font-semibold"
                          style={{
                            border: `1.5px solid ${color}30`,
                            color: '#0C447C',
                            backgroundColor: '#F5F8FF',
                            outline: 'none',
                            fontFamily: 'inherit',
                          }}
                        />
                      </div>
                    )}

                    {/* Time rows */}
                    {r.times.map((t, ti) => (
                      <div key={ti}>
                        {ti > 0 && <div style={{ height: '0.5px', backgroundColor: '#D6E4F7', margin: '0 16px' }} />}
                        <div className="flex items-center justify-between px-4 py-4 gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: '#378ADD' }}>
                              {r.times.length > 1 ? (DOSE_LABELS[ti] ?? `Dose ${ti + 1}`) : 'Reminder time'}
                            </p>
                            <button
                              type="button"
                              onClick={() => setTime(med.generic_name, ti, nowHHMM())}
                              className="text-[12px] font-semibold flex items-center gap-1"
                              style={{ color: color }}
                            >
                              <ClockMiniIcon />
                              Use current time
                            </button>
                          </div>
                          <input
                            type="time"
                            value={t}
                            onChange={e => setTime(med.generic_name, ti, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            onPointerDown={e => e.stopPropagation()}
                            className="rounded-[12px] px-3 py-2 text-[17px] font-bold shrink-0"
                            style={{
                              border: `1.5px solid ${color}20`,
                              color: color,
                              backgroundColor: '#F5F8FF',
                              outline: 'none',
                            }}
                          />
                          {isEditing && r.times.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTime(med.generic_name, ti)}
                              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                              style={{ backgroundColor: '#FEF2F2' }}
                            >
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6H10" stroke="#DC2626" strokeWidth="1.6" strokeLinecap="round" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Add dose time — edit mode only */}
                    {isEditing && (
                      <div className="px-4 pb-3" style={{ borderTop: '0.5px solid #D6E4F7' }}>
                        <button
                          type="button"
                          onClick={() => addTime(med.generic_name)}
                          className="w-full flex items-center justify-center gap-2 font-semibold text-[14px] mt-3"
                          style={{
                            minHeight: 42,
                            borderRadius: 100,
                            border: `1.5px solid ${color}40`,
                            color: color,
                            backgroundColor: `${color}08`,
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                          </svg>
                          Add dose time
                        </button>
                      </div>
                    )}

                    {/* Enable toggle */}
                    <div
                      className="flex items-center justify-between px-4 py-3.5"
                      style={{ borderTop: '0.5px solid #D6E4F7' }}
                    >
                      <p className="text-[14px] font-semibold" style={{ color: '#0C447C' }}>
                        {r.enabled ? 'Reminder enabled' : 'Reminder disabled'}
                      </p>
                      <Toggle on={r.enabled} onChange={() => update(med.generic_name, { enabled: !r.enabled })} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info tip */}
        <div
          className="mt-5 rounded-[16px] px-4 py-3.5 flex items-start gap-3"
          style={{ backgroundColor: '#EFF6FF', border: '0.5px solid #D6E4F7' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
            <circle cx="8" cy="8" r="7" stroke="#378ADD" strokeWidth="1.4" />
            <path d="M8 7V11" stroke="#378ADD" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="8" cy="5" r="0.7" fill="#378ADD" />
          </svg>
          <p className="text-[13px] leading-relaxed" style={{ color: '#378ADD' }}>
            Tap a card to set reminder times. Tap the pencil to edit the frequency or add dose times.
          </p>
        </div>

        {/* Sign out — mobile only (sidebar has it on desktop) */}
        <SignOutButton />
      </div>
    </div>
  );
}

function SignOutButton() {
  const navigate = useNavigate();
  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }
  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="lg:hidden w-full flex items-center justify-center gap-2 font-semibold text-[15px] transition-all active:scale-[0.98] mt-2"
      style={{
        minHeight: 52,
        borderRadius: 100,
        border: '1.5px solid #FECACA',
        color: '#DC2626',
        backgroundColor: '#FEF2F2',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M6 2.5H3.5C3 2.5 2.5 3 2.5 3.5V14.5C2.5 15 3 15.5 3.5 15.5H6" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 13L15.5 9L12 5" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15.5 9H6" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      Sign out
    </button>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={e => { e.stopPropagation(); onChange(); }}
      className="relative inline-flex h-7 w-12 rounded-full transition-colors duration-200 shrink-0"
      style={{ backgroundColor: on ? '#185FA5' : '#D6E4F7' }}
    >
      <span
        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200"
        style={{ left: on ? '22px' : '4px' }}
      />
    </button>
  );
}

function BellIconWhite() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 2C7.686 2 5 4.686 5 8V14L3 16H19L17 14V8C17 4.686 14.314 2 11 2Z"
        stroke="white" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
      <path d="M9 16C9 17.1 9.9 18 11 18C12.1 18 13 17.1 13 16"
        stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function BellMiniIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6V10L2 11.5H14L12.5 10V6C12.5 3.515 10.485 1.5 8 1.5Z"
        stroke={color} strokeWidth="1.4" strokeLinejoin="round" fill="none" />
      <path d="M6.5 11.5C6.5 12.328 7.172 13 8 13C8.828 13 9.5 12.328 9.5 11.5"
        stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M9.5 1.5L11.5 3.5L4 11H2V9L9.5 1.5Z"
        stroke="white" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function ClockMiniIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 3.5V6L7.5 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
