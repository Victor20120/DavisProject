import { useState } from 'react';
import PillCard from '../components/PillCard';
import type { MedData } from '../types';

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
  const [showBack,    setShowBack]    = useState(false);
  const [isSquishing, setIsSquishing] = useState(false);
  const [isPressed,   setIsPressed]   = useState(false);

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
          {showBack ? <BackCard med={MOCK_MED} /> : <PillCard data={MOCK_MED} />}
        </div>
      </div>
    </div>
  );
}

// ─── Back face ────────────────────────────────────────────────────────────────

function BackCard({ med }: { med: MedData }) {
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

      {/* White body */}
      <div className="bg-white" style={{ border: '0.5px solid #D6E4F7', borderTop: 'none' }}>

        {/* Schedule */}
        <SectionHeader label="My Schedule" />
        <BackRow label="Next dose"  value="8:00 PM"   sub="Evening · in 4h 32m" />
        <Divider />
        <BackRow label="Frequency"  value={med.frequency} />
        <Divider />
        <BackRow label="Last taken" value="8:05 AM"   sub="This morning" />

        <FullDivider />

        {/* Tailored advice */}
        <SectionHeader label="Tailored Advice" />
        {[
          { icon: '💊', label: 'Best time to take',     value: 'Morning with breakfast'           },
          { icon: '🩺', label: 'Your prescriber says',  value: 'Monitor blood pressure weekly'    },
          { icon: '⚠️',  label: 'Watch out for',         value: 'Avoid NSAIDs like Ibuprofen'      },
        ].map(row => (
          <div key={row.label}>
            <div className="flex items-center gap-4 px-5 py-4">
              <span className="text-[20px] shrink-0">{row.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                  {row.label}
                </p>
                <p className="text-[15px] font-semibold mt-0.5" style={{ color: '#0C447C' }}>
                  {row.value}
                </p>
              </div>
            </div>
            <Divider />
          </div>
        ))}

        {/* Placeholder notice */}
        <div className="px-5 pt-1 pb-4">
          <p
            className="text-center text-[12px] font-medium px-4 py-3 rounded-[12px]"
            style={{ backgroundColor: '#F5F8FF', color: '#378ADD' }}
          >
            Tailored advice placeholder — real tips load after scan
          </p>
        </div>

        <FullDivider />

        {/* Personal notes */}
        <SectionHeader label="Personal Notes" />
        <div className="px-5 pb-6">
          <div
            className="rounded-[12px] px-4 py-4"
            style={{ backgroundColor: '#F5F8FF', border: '1px dashed #D6E4F7' }}
          >
            <p className="text-[14px]" style={{ color: '#C4CDD6', fontStyle: 'italic' }}>
              No notes yet — tap to add a personal note...
            </p>
          </div>
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
