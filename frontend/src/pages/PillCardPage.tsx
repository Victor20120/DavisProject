import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PillCard from '../components/PillCard';
import type { MedData } from '../types';
import type { AdviceItem } from '../services/claude';
import { getPersonalizedAdvice } from '../services/claude';
import { useAuth } from '../contexts/AuthContext';
import { getMed, updateMedNotes, updateMedReminderTime, getUserProfile, removeMed } from '../database/firestore';

function getInitialMed(): MedData {
  try {
    const stored = sessionStorage.getItem('lastScan');
    if (stored) return JSON.parse(stored) as MedData;
  } catch {}
  return MOCK_MED;
}

const MOCK_MED: MedData = {
  common_name: 'Blood Pressure Pill',
  generic_name: 'Lisinopril',
  dosage: '10mg',
  form: 'Oral tablet',
  drug_class: 'ACE Inhibitor',
  active_ingredient: 'Lisinopril 10mg',
  common_effects: 'Dizziness, dry cough, headache',
  manufacturer: 'Lupin Pharma',
  how_to_take:
    'Take one tablet by mouth once a day. You can take it with or without food. Try to take it at the same time each day. Do not stop taking it without talking to your doctor first.',
  frequency: 'Once daily',
  take_with_food: false,
  conflicts: [],
};

export default function PillCardPage() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const [med]           = useState<MedData>(getInitialMed);
  const [isSaved,     setIsSaved]     = useState(false);
  const [showBack,      setShowBack]      = useState(false);
  const [isSquishing,   setIsSquishing]   = useState(false);
  const [isPressed,     setIsPressed]     = useState(false);
  const [notes,         setNotes]         = useState('');
  const [reminderTime,  setReminderTime]  = useState('');
  const [lastTakenDate, setLastTakenDate] = useState<string | null>(null);
  const [advice,        setAdvice]        = useState<AdviceItem[]>([]);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [removing,      setRemoving]      = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (!user) return;
    getMed(user.uid, med.generic_name)
      .then(data => {
        if (data) {
          setIsSaved(true);
          if (data.notes) setNotes(data.notes);
          if (data.reminderTime) setReminderTime(data.reminderTime);
          const d = data as typeof data & { lastTakenDate?: string };
          if (d.lastTakenDate) setLastTakenDate(d.lastTakenDate);
        }
      })
      .catch(() => {});
  }, [user, med.generic_name]);

  useEffect(() => {
    if (!user) return;
    setAdviceLoading(true);
    getUserProfile(user.uid)
      .then(profile => {
        if (!profile) { setAdviceLoading(false); return; }
        return getPersonalizedAdvice(med, profile).then(items => {
          setAdvice(items);
          setAdviceLoading(false);
        });
      })
      .catch(() => setAdviceLoading(false));
  }, [user, med.generic_name]);

  async function handleNotesChange(text: string) {
    setNotes(text);
    if (user) await updateMedNotes(user.uid, med.generic_name, text);
  }

  async function handleReminderTimeChange(time: string) {
    setReminderTime(time);
    if (user) await updateMedReminderTime(user.uid, med.generic_name, time).catch(() => {});
  }

  async function handleRemove() {
    if (!user) return;
    setRemoving(true);
    try {
      await removeMed(user.uid, med.generic_name);
      sessionStorage.removeItem('lastScan');
      navigate('/medications');
    } catch {
      setRemoving(false);
    }
  }

  function handleFlip() {
    if (isSquishing) return;
    setIsSquishing(true);
    setTimeout(() => {
      setShowBack(p => !p);
      setIsSquishing(false);
    }, 160);
  }

  return (
    <div className="min-h-screen pb-24 px-4" style={{ backgroundColor: '#F5F8FF' }}>

      {/* Page header */}
      <header className="flex items-center gap-4 px-1 pt-12 pb-5">
        <button
          type="button"
          aria-label="Go back"
          className="flex items-center justify-center w-10 h-10 rounded-full"
          style={{ backgroundColor: '#fff', border: '0.5px solid #D6E4F7' }}
          onClick={() => window.history.back()}
        >
          <BackArrow />
        </button>
        <span className="text-[18px] font-semibold" style={{ color: '#0C447C' }}>
          Medication Details
        </span>
      </header>

      {/* Flip hint */}
      <p
        className="text-center text-[13px] font-medium mb-3"
        style={{ color: '#378ADD', opacity: 0.6 }}
      >
        {showBack ? 'Tap card to flip back' : 'Tap card to flip for your info'}
      </p>

      {/* Press wrapper — tap-in / tap-out scale */}
      <div
        style={{
          cursor: 'pointer',
          transform: isPressed ? 'scale(0.965)' : 'scale(1)',
          transformOrigin: 'center top',
          transition: isPressed
            ? 'transform 0.08s ease'
            : 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onPointerDown={() => setIsPressed(true)}
        onPointerUp={() => { setIsPressed(false); handleFlip(); }}
        onPointerLeave={() => setIsPressed(false)}
        onPointerCancel={() => setIsPressed(false)}
      >
        {/* Squish wrapper — scaleX flip */}
        <div
          style={{
            transformOrigin: 'center',
            transform: isSquishing ? 'scaleX(0)' : 'scaleX(1)',
            transition: 'transform 0.16s ease',
          }}
        >
          {showBack
            ? <BackCard med={med} notes={notes} onNotesChange={handleNotesChange} reminderTime={reminderTime} onReminderTimeChange={handleReminderTimeChange} lastTakenDate={lastTakenDate} />
            : <PillCard data={med} onOkay={() => navigate('/')} advice={advice} adviceLoading={adviceLoading} isAlreadySaved={isSaved} onSaved={() => setIsSaved(true)} />}
        </div>
      </div>

      {/* Remove button — only shown when med is saved */}
      {isSaved && (
        <div className="flex justify-end mt-4 px-1">
          {confirmRemove ? (
            <div className="flex items-center gap-3">
              <span className="text-[14px] font-medium" style={{ color: '#9CA3AF' }}>Remove this medication?</span>
              <button
                type="button"
                onClick={() => setConfirmRemove(false)}
                className="text-[14px] font-semibold px-4 py-2 rounded-full"
                style={{ border: '1px solid #D6E4F7', color: '#9CA3AF' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={handleRemove}
                className="text-[14px] font-semibold px-4 py-2 rounded-full text-white disabled:opacity-60"
                style={{ backgroundColor: '#DC2626' }}
              >
                {removing ? 'Removing…' : 'Yes, remove'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="flex items-center gap-2 text-[14px] font-semibold px-4 py-2 rounded-full"
              style={{ color: '#DC2626', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}
            >
              <TrashIcon /> Remove medication
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Back face ────────────────────────────────────────────────────────────────

function formatTime12h(time24: string): string {
  if (!time24) return 'Not set';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatLastTaken(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return dateStr;
}

function BackCard({
  med,
  notes,
  onNotesChange,
  reminderTime,
  onReminderTimeChange,
  lastTakenDate,
}: {
  med: MedData;
  notes: string;
  onNotesChange: (text: string) => void;
  reminderTime: string;
  onReminderTimeChange: (time: string) => Promise<void>;
  lastTakenDate: string | null;
}) {
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [draftTime, setDraftTime] = useState(reminderTime);

  function handleSaveSchedule() {
    onReminderTimeChange(draftTime);
    setEditingSchedule(false);
  }

  return (
    <div className="w-full overflow-hidden" style={{ borderRadius: 20 }}>

      {/* Navy header */}
      <div className="px-5 pt-6 pb-5" style={{ backgroundColor: '#0C447C' }}>
        <div className="flex items-start gap-4 mb-1">
          <div
            className="w-12 h-12 rounded-[12px] flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#185FA5' }}
          >
            <UserIcon />
          </div>
          <div>
            <h2 className="text-[20px] font-bold text-white leading-tight">{med.generic_name}</h2>
            <p className="text-[14px] mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
              My information
            </p>
          </div>
        </div>
      </div>

      {/* White body — block pointer events so the card doesn't flip */}
      <div
        className="bg-white"
        style={{ border: '0.5px solid #D6E4F7', borderTop: 'none' }}
        onPointerDown={e => e.stopPropagation()}
        onPointerUp={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        onTouchEnd={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >

        {/* Schedule */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: '#378ADD' }}>My Schedule</p>
          {!editingSchedule && (
            <button
              type="button"
              onClick={() => { setDraftTime(reminderTime); setEditingSchedule(true); }}
              className="text-[12px] font-semibold px-3 py-1 rounded-full"
              style={{ color: '#185FA5', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}
            >
              Edit
            </button>
          )}
        </div>

        {editingSchedule ? (
          <div className="px-5 pb-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold" style={{ color: '#0C447C' }}>Reminder time</label>
              <input
                type="time"
                value={draftTime}
                onChange={e => setDraftTime(e.target.value)}
                className="outline-none text-[15px] px-3"
                style={{
                  height: 44, borderRadius: 10, border: '1.5px solid #185FA5',
                  color: '#0C447C', fontFamily: 'inherit', backgroundColor: '#F5F8FF', width: '100%',
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-bold" style={{ color: '#0C447C' }}>Frequency</span>
              <span className="text-[14px] px-3 py-2.5 rounded-[10px]" style={{ backgroundColor: '#F5F8FF', color: '#0C447C' }}>
                {med.frequency}
              </span>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleSaveSchedule}
                className="flex-1 font-semibold text-[15px] text-white"
                style={{ minHeight: 44, borderRadius: 100, backgroundColor: '#185FA5' }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingSchedule(false)}
                className="font-semibold text-[15px] px-5"
                style={{ minHeight: 44, borderRadius: 100, border: '1.5px solid #D6E4F7', color: '#9CA3AF' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <BackRow label="Reminder" value={formatTime12h(reminderTime)} sub={reminderTime ? med.frequency : undefined} />
            <Divider />
            <BackRow label="Frequency" value={med.frequency} />
            {lastTakenDate && (
              <>
                <Divider />
                <BackRow label="Last taken" value={formatLastTaken(lastTakenDate)} />
              </>
            )}
          </>
        )}

        <FullDivider />

        {/* Personal notes */}
        <SectionHeader label="Personal Notes" />
        <div className="px-5 pb-6">
          <textarea
            value={notes}
            onChange={e => onNotesChange(e.target.value)}
            placeholder="No notes yet — tap to add a personal note..."
            rows={4}
            className="w-full resize-none outline-none text-[14px] leading-relaxed rounded-[12px] px-4 py-4"
            style={{
              backgroundColor: '#F5F8FF',
              border: '1px dashed #D6E4F7',
              color: '#0C447C',
              fontFamily: 'inherit',
              caretColor: '#185FA5',
            }}
          />
          {notes.length > 0 && (
            <p className="text-[12px] mt-1.5 text-right font-medium" style={{ color: '#378ADD', opacity: 0.6 }}>
              Saved automatically
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[12px] font-bold uppercase tracking-widest px-5 pt-4 pb-2" style={{ color: '#378ADD' }}>
      {label}
    </p>
  );
}

function BackRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-[14px] shrink-0" style={{ color: '#9CA3AF' }}>{label}</span>
      <div className="text-right">
        <p className="text-[15px] font-semibold" style={{ color: '#0C447C' }}>{value}</p>
        {sub && <p className="text-[12px]" style={{ color: '#9CA3AF' }}>{sub}</p>}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: '0.5px', backgroundColor: '#D6E4F7', margin: '0 20px' }} />;
}

function FullDivider() {
  return <div style={{ height: '8px', backgroundColor: '#F5F8FF' }} />;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M3 6H21M8 6V4H16V6M19 6L18 20H6L5 6" stroke="#DC2626" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BackArrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M12.5 15L7.5 10L12.5 5" stroke="#0C447C" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="1.7" />
      <path d="M4 20C4 16.5 7.5 14 12 14C16.5 14 20 16.5 20 20" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
