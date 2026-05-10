import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MedData } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { onMedsChanged, updateMedNotes, updateMedSchedule, seedDemoData, saveMed, markMedTaken } from '../database/firestore';

const CARD_COLORS = ['#0C447C', '#185FA5', '#2563EB'];

// ─── Stack constants ──────────────────────────────────────────────────────────

const HEADER_H   = 78;
const BODY_H     = 62;
const CARD_H     = HEADER_H + BODY_H;
const GAP        = 14;
const EXPANDED_H = 360;

// ─── Page ────────────────────────────────────────────────────────────────────

type FirestoreMed = MedData & { notes: string; reminderTime: string; lastTakenDate?: string };

export default function Medications() {
  const { user }                          = useAuth();
  const [meds, setMeds]                   = useState<FirestoreMed[]>([]);
  const [medsLoading, setMedsLoading]     = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isFlipped, setIsFlipped]         = useState(false);
  const [pressedIndex, setPressedIndex]   = useState<number | null>(null);
  const [viewMode, setViewMode]           = useState<'stack' | 'list'>('stack');
  const [showManualForm, setShowManualForm] = useState(false);
  const navigate = useNavigate();

  const notesMap = Object.fromEntries(meds.map(m => [m.generic_name, m.notes ?? '']));

  // Firestore real-time listener — auto-seeds demo data for new users
  useEffect(() => {
    if (!user) return;
    let seeded = false;
    const unsub = onMedsChanged(user.uid, async (loaded) => {
      if (loaded.length === 0 && !seeded) {
        seeded = true;
        await seedDemoData(user.uid);
      } else if (loaded.length > 0) {
        // Sort consistently: alphabetical by generic_name
        setMeds([...loaded].sort((a, b) => a.generic_name.localeCompare(b.generic_name)));
        setMedsLoading(false);
      }
    });
    return unsub;
  }, [user]);

  async function handleNotesChange(genericName: string, text: string) {
    // Optimistic local update so typing feels instant
    setMeds(prev => prev.map(m => m.generic_name === genericName ? { ...m, notes: text } : m));
    if (user) await updateMedNotes(user.uid, genericName, text);
  }

  const n = meds.length;

  const containerH =
    selectedIndex === null
      ? (n - 1) * HEADER_H + CARD_H
      : EXPANDED_H + GAP + (n - 2) * HEADER_H + CARD_H;

  function getCardStyle(index: number) {
    if (selectedIndex === null) {
      return {
        top:    (n - 1 - index) * HEADER_H,
        height: CARD_H,
        zIndex: n - index,
      };
    }
    if (index === selectedIndex) {
      return { top: 0, height: EXPANDED_H, zIndex: n + 1 };
    }
    const others = meds.map((_, i) => i).filter(i => i !== selectedIndex);
    const pos = others.indexOf(index);
    return {
      top:    EXPANDED_H + GAP + pos * HEADER_H,
      height: CARD_H,
      zIndex: pos + 1,
    };
  }

  function handleCardClick(index: number) {
    if (selectedIndex === null) {
      setSelectedIndex(index);
      setIsFlipped(false);
    } else if (selectedIndex === index) {
      setIsFlipped(prev => !prev);
    } else {
      setSelectedIndex(index);
      setIsFlipped(false);
    }
  }

  function handleClose(e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIndex(null);
    setIsFlipped(false);
  }

  const today = new Date().toISOString().slice(0, 10);

  async function handleMarkTaken(e: React.MouseEvent, med: FirestoreMed) {
    e.stopPropagation();
    if (!user) return;
    await markMedTaken(user.uid, med.generic_name);
    // Browser notification
    if ('Notification' in window) {
      const perm = Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission;
      if (perm === 'granted') {
        new Notification(`${med.common_name} marked as taken`, {
          body: `${med.generic_name} ${med.dosage} — ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          icon: '/favicon.svg',
          tag:  `taken-${med.generic_name}`,
        });
      }
    }
    // Notify family + send email (fire-and-forget)
    fetch('http://localhost:8000/family/notify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviter_uid:  user.uid,
        med_name:     `${med.common_name} (${med.generic_name} ${med.dosage})`,
        status:       'taken',
        display_name: user.displayName ?? 'Your family member',
      }),
    }).catch(() => {});
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-8 px-4 pt-10 lg:pt-12" style={{ backgroundColor: '#F5F8FF' }}>
      <div className="w-full max-w-[520px] mx-auto">

        {/* Header */}
        <header className="mb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[24px] font-bold" style={{ color: '#0C447C' }}>My Medications</h1>
              <p className="text-[14px] mt-0.5" style={{ color: '#378ADD' }}>
                {meds.length} medication{meds.length !== 1 ? 's' : ''} scanned
              </p>
            </div>

            {/* Add button */}
            <div className="relative shrink-0 pt-1">
              <button
                type="button"
                onClick={() => setShowManualForm(true)}
                className="flex items-center gap-1.5 px-3.5 rounded-full font-semibold text-[14px] text-white transition-transform active:scale-95"
                style={{ backgroundColor: '#185FA5', height: 36 }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2V12M2 7H12" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Add
              </button>
            </div>
          </div>
        </header>

        {/* Loading state */}
        {medsLoading && (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin" width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="13" stroke="#D6E4F7" strokeWidth="3" />
              <path d="M16 3C8.8 3 3 8.8 3 16" stroke="#185FA5" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {/* Conflict banner */}

        {/* Segmented control */}
        <div className="flex items-center gap-3 mb-7">
          <div className="flex rounded-full p-1 gap-0.5" style={{ backgroundColor: '#E0ECFA' }}>
            {(['stack', 'list'] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => { setViewMode(v); setSelectedIndex(null); setIsFlipped(false); }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-200"
                style={{
                  backgroundColor: viewMode === v ? '#fff' : 'transparent',
                  color: viewMode === v ? '#185FA5' : '#378ADD',
                  boxShadow: viewMode === v ? '0 1px 4px rgba(12,68,124,0.14)' : 'none',
                }}
              >
                {v === 'stack' ? <StackIcon active={viewMode === v} /> : <ListIcon active={viewMode === v} />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Stack view ── */}
        {viewMode === 'stack' && (
          <>
            <div
              className="relative w-full"
              style={{
                height: containerH,
                transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {meds.map((med, i) => {
                const { top, height, zIndex } = getCardStyle(i);
                const isSelected = selectedIndex === i;
                const isPressed  = pressedIndex === i;
                const color      = CARD_COLORS[i % CARD_COLORS.length];

                return (
                  <div
                    key={med.generic_name}
                    className="absolute left-0 right-0 w-full"
                    style={{
                      top,
                      height,
                      zIndex,
                      borderRadius: 22,
                      cursor: 'pointer',
                      transform: isPressed ? 'scale(0.965)' : 'scale(1)',
                      transformOrigin: 'center center',
                      transition: isPressed
                        ? 'top 0.4s cubic-bezier(0.4,0,0.2,1), height 0.4s cubic-bezier(0.4,0,0.2,1), transform 0.08s ease, box-shadow 0.3s ease'
                        : 'top 0.4s cubic-bezier(0.4,0,0.2,1), height 0.4s cubic-bezier(0.4,0,0.2,1), transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease',
                      boxShadow: isSelected
                        ? '0 12px 40px rgba(12,68,124,0.25)'
                        : `0 4px 18px rgba(12,68,124,${0.18 - i * 0.04})`,
                    }}
                    onClick={() => handleCardClick(i)}
                    onPointerDown={() => setPressedIndex(i)}
                    onPointerUp={() => setPressedIndex(null)}
                    onPointerLeave={() => setPressedIndex(null)}
                    onPointerCancel={() => setPressedIndex(null)}
                  >
                    {isSelected ? (
                      <div style={{ width: '100%', height: '100%', perspective: '1200px' }}>
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            position: 'relative',
                            transformStyle: 'preserve-3d',
                            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                            transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}
                        >
                          {/* Front */}
                          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: 22, overflow: 'hidden' }}>
                            <ExpandedFront
                              med={med}
                              color={color}
                              notes={notesMap[med.generic_name] ?? ''}
                              takenToday={med.lastTakenDate === today}
                              onClose={handleClose}
                              onMarkTaken={e => handleMarkTaken(e, med)}
                              onViewFull={e => {
                                e.stopPropagation();
                                sessionStorage.setItem('lastScan', JSON.stringify(med));
                                navigate('/pill-card');
                              }}
                            />
                          </div>
                          {/* Back */}
                          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: 22, overflow: 'hidden' }}>
                            <ExpandedBack
                              med={med}
                              color={color}
                              notes={notesMap[med.generic_name] ?? ''}
                              onNotesChange={text => handleNotesChange(med.generic_name, text)}
                              onClose={handleClose}
                              userId={user?.uid ?? ''}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <CompactCard med={med} color={color} />
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-center text-[13px] mt-5 font-medium" style={{ color: '#378ADD', opacity: 0.6 }}>
              {selectedIndex === null
                ? 'Tap any card to open it'
                : isFlipped
                  ? 'Tap to flip back · ✕ to close'
                  : 'Tap card to flip for your info · ✕ to close'}
            </p>
          </>
        )}

        {/* ── List view ── */}
        {viewMode === 'list' && (
          <div className="flex flex-col gap-3">
            {meds.map((med, i) => (
              <button
                key={med.generic_name}
                type="button"
                onClick={() => {
                  sessionStorage.setItem('lastScan', JSON.stringify(med));
                  navigate('/pill-card');
                }}
                className="text-left w-full overflow-hidden active:scale-[0.97] transition-transform duration-100"
                style={{ borderRadius: 22, boxShadow: '0 2px 14px rgba(12,68,124,0.10)' }}
              >
                <CompactCard med={med} color={CARD_COLORS[i % CARD_COLORS.length]} />
              </button>
            ))}
          </div>
        )}

      </div>

      {/* Manual add modal */}
      {showManualForm && (
        <ManualAddModal
          onClose={() => setShowManualForm(false)}
          onSave={async (med) => {
            if (user) await saveMed(user.uid, med);
            setShowManualForm(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Manual add modal ─────────────────────────────────────────────────────────

function ManualAddModal({ onClose, onSave }: {
  onClose: () => void;
  onSave:  (med: MedData) => Promise<void>;
}) {
  const EMPTY: MedData = {
    common_name: '', generic_name: '', dosage: '', form: 'Oral tablet',
    drug_class: '', active_ingredient: '', common_effects: '',
    manufacturer: '', how_to_take: '', frequency: 'Once daily',
    take_with_food: false, conflicts: [],
  };
  const [form, setForm]   = useState<MedData>(EMPTY);
  const [saving, setSaving] = useState(false);

  function set(key: keyof MedData, val: string | boolean) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    if (!form.generic_name.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(12,68,124,0.35)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] rounded-[24px] overflow-hidden"
        style={{ backgroundColor: '#fff', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: '#0C447C' }}>
          <p className="text-white font-bold text-[17px]">Add medication</p>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2L10 10M10 2L2 10" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-0 divide-y" style={{ borderColor: '#D6E4F7' }}>
          {([
            ['Common name',       'common_name',       'e.g. Blood Pressure Pill'],
            ['Generic name *',    'generic_name',       'e.g. Lisinopril'],
            ['Dosage',            'dosage',             'e.g. 10mg'],
            ['Drug class',        'drug_class',         'e.g. ACE Inhibitor'],
            ['Active ingredient', 'active_ingredient',  'e.g. Lisinopril 10mg'],
            ['Common effects',    'common_effects',     'e.g. Dizziness, dry cough'],
            ['Manufacturer',      'manufacturer',       'e.g. Lupin Pharma'],
            ['Frequency',         'frequency',          'e.g. Once daily'],
          ] as [string, keyof MedData, string][]).map(([label, key, placeholder]) => (
            <div key={key} className="flex items-center justify-between px-5 py-3 gap-3">
              <p className="text-[13px] font-semibold shrink-0" style={{ color: '#378ADD' }}>{label}</p>
              <input
                type="text"
                placeholder={placeholder}
                value={form[key] as string}
                onChange={e => set(key, e.target.value)}
                className="flex-1 text-right text-[14px] outline-none bg-transparent"
                style={{ color: '#0C447C', fontFamily: 'inherit' }}
              />
            </div>
          ))}

          {/* How to take */}
          <div className="px-5 py-3">
            <p className="text-[13px] font-semibold mb-2" style={{ color: '#378ADD' }}>How to take</p>
            <textarea
              rows={3}
              placeholder="Plain-English instructions…"
              value={form.how_to_take}
              onChange={e => set('how_to_take', e.target.value)}
              className="w-full resize-none outline-none text-[14px] rounded-[12px] p-3"
              style={{ backgroundColor: '#F5F8FF', color: '#0C447C', fontFamily: 'inherit', border: '0.5px solid #D6E4F7' }}
            />
          </div>

          {/* Take with food toggle */}
          <div className="flex items-center justify-between px-5 py-3">
            <p className="text-[13px] font-semibold" style={{ color: '#378ADD' }}>Take with food</p>
            <button
              type="button"
              role="switch"
              aria-checked={form.take_with_food}
              onClick={() => set('take_with_food', !form.take_with_food)}
              className="relative inline-flex h-7 w-12 rounded-full transition-colors duration-200"
              style={{ backgroundColor: form.take_with_food ? '#185FA5' : '#D6E4F7' }}
            >
              <span className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200"
                style={{ left: form.take_with_food ? '22px' : '4px' }} />
            </button>
          </div>
        </div>

        {/* Save button */}
        <div className="px-5 py-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !form.generic_name.trim()}
            className="w-full font-bold text-[15px] text-white disabled:opacity-50 transition-transform active:scale-[0.98]"
            style={{ minHeight: 52, borderRadius: 100, backgroundColor: '#185FA5' }}
          >
            {saving ? 'Saving…' : 'Save medication'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Compact card ─────────────────────────────────────────────────────────────

function CompactCard({ med, color }: { med: MedData; color: string }) {
  const safe = med.conflicts.length === 0;
  return (
    <div style={{ height: CARD_H, backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden' }}>
      <div className="flex items-center gap-3 px-4" style={{ backgroundColor: color, height: HEADER_H }}>
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
          <PillIconWhite />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-[16px] leading-tight truncate">{med.common_name}</p>
          <p className="text-[13px] truncate" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {med.generic_name} · {med.dosage}
          </p>
        </div>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
          <path d="M7 5L11 9L7 13" stroke="rgba(255,255,255,0.45)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex items-center gap-2 px-4 flex-wrap" style={{ height: BODY_H, borderTop: '0.5px solid rgba(214,228,247,0.6)' }}>
        <MiniTag label={safe ? '✓ Safe' : '⚠ Conflict'} color={safe ? '#16A34A' : '#DC2626'} bg={safe ? '#F0FDF4' : '#FEF2F2'} />
        <MiniTag label={med.frequency} color="#185FA5" bg="#EFF6FF" />
        {med.take_with_food && <MiniTag label="Take with food" color="#D97706" bg="#FFFBEB" />}
      </div>
    </div>
  );
}

// ─── Expanded front face ──────────────────────────────────────────────────────

function ExpandedFront({
  med, color, notes, takenToday, onClose, onViewFull, onMarkTaken,
}: {
  med: MedData;
  color: string;
  notes: string;
  takenToday: boolean;
  onClose: (e: React.MouseEvent) => void;
  onViewFull: (e: React.MouseEvent) => void;
  onMarkTaken: (e: React.MouseEvent) => void;
}) {
  const safe = med.conflicts.length === 0;
  return (
    <div className="flex flex-col" style={{ height: EXPANDED_H, backgroundColor: '#fff' }}>
      <div className="flex items-center gap-3 px-4 shrink-0" style={{ backgroundColor: color, height: HEADER_H }}>
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
          <PillIconWhite />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-[17px] leading-tight truncate">{med.common_name}</p>
          <p className="text-[13px] truncate" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {med.generic_name} · {med.dosage}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2 px-4 flex-wrap shrink-0" style={{ height: BODY_H, borderTop: '0.5px solid rgba(214,228,247,0.6)' }}>
        <MiniTag label={safe ? '✓ Safe' : '⚠ Conflict'} color={safe ? '#16A34A' : '#DC2626'} bg={safe ? '#F0FDF4' : '#FEF2F2'} />
        <MiniTag label={med.frequency} color="#185FA5" bg="#EFF6FF" />
        {med.take_with_food && <MiniTag label="Take with food" color="#D97706" bg="#FFFBEB" />}
      </div>

      <div className="flex-1 flex flex-col justify-between px-4 py-3">
        <div className="flex flex-col gap-2">
          <p className="text-[13px] leading-relaxed line-clamp-2" style={{ color: '#64748B' }}>
            {med.how_to_take}
          </p>
          {notes ? (
            <p className="text-[13px] font-medium leading-snug line-clamp-2" style={{ color: '#DC2626' }}>
              {notes}
            </p>
          ) : (
            <p className="text-[12px] italic" style={{ color: '#C7D9EF' }}>
              No notes yet — flip card to add
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-center text-[12px] font-medium" style={{ color: '#C7D9EF' }}>
            Tap card to flip for your info
          </p>
          <button
            type="button"
            onClick={onMarkTaken}
            disabled={takenToday}
            className="w-full flex items-center justify-center gap-1.5 font-semibold text-[14px] transition-all active:scale-[0.98]"
            style={{
              minHeight: 42,
              borderRadius: 100,
              backgroundColor: takenToday ? '#F0FDF4' : '#16A34A',
              color: takenToday ? '#16A34A' : '#fff',
              border: takenToday ? '1px solid #4ADE80' : 'none',
            }}
          >
            {takenToday ? (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7L5.5 10.5L12 3.5" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Taken today
              </>
            ) : 'Mark as taken'}
          </button>
          <button
            type="button"
            onClick={onViewFull}
            className="w-full flex items-center justify-center gap-1.5 font-semibold text-[14px]"
            style={{ minHeight: 42, borderRadius: 100, backgroundColor: color, color: '#fff' }}
          >
            View full card
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 3L9 7L5 11" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Expanded back face ───────────────────────────────────────────────────────

function timeUntil(hhmm: string, now: Date): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const targetMins = h * 60 + m;
  let diff = targetMins - nowMins;
  if (diff <= 0) diff += 1440;
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hrs === 0) return `in ${mins}m`;
  if (mins === 0) return `in ${hrs}h`;
  return `in ${hrs}h ${mins}m`;
}

function fmt12back(hhmm: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function ExpandedBack({
  med, color, notes, onNotesChange, onClose, userId,
}: {
  med: FirestoreMed;
  color: string;
  notes: string;
  onNotesChange: (text: string) => void;
  onClose: (e: React.MouseEvent) => void;
  userId: string;
}) {
  const [reminderTime, setReminderTime] = useState(med.reminderTime ?? '');
  const [frequency,    setFrequency]    = useState(med.frequency ?? '');
  const [now,          setNow]          = useState(new Date());

  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(id); }, []);
  useEffect(() => { setReminderTime(med.reminderTime ?? ''); }, [med.reminderTime]);
  useEffect(() => { setFrequency(med.frequency ?? ''); }, [med.frequency]);

  async function saveSchedule(time: string, freq: string) {
    if (!userId) return;
    await updateMedSchedule(userId, med.generic_name, time, freq);
    try {
      const raw = sessionStorage.getItem('pal_reminders_cache');
      const cache: Record<string, { enabled: boolean; times: string[] }> = raw ? JSON.parse(raw) : {};
      cache[med.generic_name] = { enabled: !!time, times: time ? [time] : [] };
      sessionStorage.setItem('pal_reminders_cache', JSON.stringify(cache));
    } catch {}
  }

  const untilText = timeUntil(reminderTime, now);

  return (
    <div className="flex flex-col" style={{ height: EXPANDED_H, backgroundColor: color }}>
      <div className="flex items-center justify-between px-5 shrink-0" style={{ height: HEADER_H }}>
        <div>
          <p className="text-white font-bold text-[16px]">{med.generic_name}</p>
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.6)' }}>My Schedule</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div
        className="flex-1 mx-3 mb-3 rounded-[16px] flex flex-col overflow-hidden"
        style={{ backgroundColor: '#fff' }}
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
      >
        {/* Editable: Next dose time */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <p className="text-[11px] font-bold uppercase tracking-widest shrink-0" style={{ color: '#378ADD' }}>Next dose</p>
          <div className="flex flex-col items-end">
            <input
              type="time"
              value={reminderTime}
              onChange={e => setReminderTime(e.target.value)}
              onBlur={() => saveSchedule(reminderTime, frequency)}
              className="text-[14px] font-semibold outline-none text-right bg-transparent"
              style={{ color: '#0C447C', fontFamily: 'inherit', border: 'none', cursor: 'pointer', minWidth: 0 }}
            />
            <p className="text-[12px]" style={{ color: '#9CA3AF' }}>
              {reminderTime ? `${fmt12back(reminderTime)} · ${untilText}` : 'Tap to set a time'}
            </p>
          </div>
        </div>
        <div style={{ height: '0.5px', backgroundColor: '#D6E4F7', margin: '0 16px' }} />

        {/* Editable: Frequency */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <p className="text-[11px] font-bold uppercase tracking-widest shrink-0" style={{ color: '#378ADD' }}>Frequency</p>
          <input
            type="text"
            value={frequency}
            onChange={e => setFrequency(e.target.value)}
            onBlur={() => saveSchedule(reminderTime, frequency)}
            className="text-[14px] font-semibold outline-none text-right flex-1 ml-4 bg-transparent"
            style={{ color: '#0C447C', fontFamily: 'inherit', border: 'none' }}
          />
        </div>
        <div style={{ height: '0.5px', backgroundColor: '#D6E4F7', margin: '0 16px' }} />

        {/* Personal notes */}
        <div className="flex-1 flex flex-col px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#378ADD' }}>
            Personal notes
          </p>
          <textarea
            value={notes}
            onChange={e => onNotesChange(e.target.value)}
            placeholder="Tap to add personal notes..."
            rows={3}
            className="flex-1 resize-none outline-none text-[13px] leading-relaxed"
            style={{ color: '#0C447C', fontFamily: 'inherit', caretColor: color }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function MiniTag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ color, backgroundColor: bg }}>
      {label}
    </span>
  );
}

function PillIconWhite() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="4" y="8" width="14" height="6" rx="3"
        transform="rotate(-45 11 11)"
        stroke="white" strokeWidth="1.5" fill="none" />
      <line x1="8.5" y1="8.5" x2="13.5" y2="13.5"
        stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function StackIcon({ active }: { active: boolean }) {
  const c = active ? '#185FA5' : '#378ADD';
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="0" y="1" width="14" height="3.5" rx="1" fill={c} opacity={active ? '1' : '0.5'} />
      <rect x="1" y="5.5" width="12" height="3.5" rx="1" fill={c} opacity={active ? '0.75' : '0.35'} />
      <rect x="2" y="10" width="10" height="3.5" rx="1" fill={c} opacity={active ? '0.5' : '0.2'} />
    </svg>
  );
}

function ListIcon({ active }: { active: boolean }) {
  const c = active ? '#185FA5' : '#378ADD';
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="0" y="1" width="14" height="3.5" rx="1" fill={c} opacity="0.9" />
      <rect x="0" y="5.5" width="14" height="3.5" rx="1" fill={c} opacity="0.9" />
      <rect x="0" y="10" width="14" height="3.5" rx="1" fill={c} opacity="0.9" />
    </svg>
  );
}
