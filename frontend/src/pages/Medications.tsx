import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MedData, ConflictResult } from '../types';
import ConflictAlert from '../components/ConflictAlert';
import { loadNotes, saveNotes } from '../utils/storage';
import { scanPillBottle } from '../services/api';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_MEDS: MedData[] = [
  {
    common_name: 'Blood Pressure Pill',
    generic_name: 'Lisinopril',
    dosage: '10mg',
    form: 'Oral tablet',
    drug_class: 'ACE Inhibitor',
    active_ingredient: 'Lisinopril 10mg',
    common_effects: 'Dizziness, dry cough',
    manufacturer: 'Lupin Pharma',
    how_to_take: 'Take once daily, with or without food. Best taken at the same time each day.',
    frequency: 'Once daily',
    take_with_food: false,
    conflicts: ['May reduce effectiveness when taken with Ibuprofen'],
  },
  {
    common_name: 'Pain Reliever',
    generic_name: 'Ibuprofen',
    dosage: '400mg',
    form: 'Oral tablet',
    drug_class: 'NSAID',
    active_ingredient: 'Ibuprofen 400mg',
    common_effects: 'Stomach upset, nausea',
    manufacturer: 'Advil',
    how_to_take: 'Take with food or milk to reduce stomach upset. Do not exceed 3 doses per day.',
    frequency: 'Every 6 hrs as needed',
    take_with_food: true,
    conflicts: ['May reduce effectiveness of Lisinopril'],
  },
  {
    common_name: 'Diabetes Pill',
    generic_name: 'Metformin',
    dosage: '500mg',
    form: 'Oral tablet',
    drug_class: 'Biguanide',
    active_ingredient: 'Metformin HCl 500mg',
    common_effects: 'Nausea, diarrhea',
    manufacturer: 'Teva Pharmaceuticals',
    how_to_take: 'Take with meals to reduce stomach upset. Swallow whole with a full glass of water.',
    frequency: 'Twice daily',
    take_with_food: true,
    conflicts: [],
  },
];

const MOCK_CONFLICTS: ConflictResult['conflicts'] = [
  {
    drug_a: 'Lisinopril',
    drug_b: 'Ibuprofen',
    severity: 'moderate',
    description:
      'Ibuprofen can reduce the blood pressure-lowering effect of Lisinopril and may increase risk of kidney problems.',
  },
];

const CARD_COLORS = ['#0C447C', '#185FA5', '#2563EB'];

// ─── Stack constants ──────────────────────────────────────────────────────────

const HEADER_H   = 78;
const BODY_H     = 62;
const CARD_H     = HEADER_H + BODY_H;
const GAP        = 14;
const EXPANDED_H = 360;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Medications() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isFlipped, setIsFlipped]         = useState(false);
  const [pressedIndex, setPressedIndex]   = useState<number | null>(null);
  const [viewMode, setViewMode]           = useState<'stack' | 'list'>('stack');
  const [notesMap, setNotesMap]           = useState<Record<string, string>>({});
  const [showAddMenu, setShowAddMenu]     = useState(false);
  const [scanning, setScanning]           = useState(false);
  const navigate   = useNavigate();
  const addMenuRef = useRef<HTMLDivElement>(null);
  const cameraRef  = useRef<HTMLInputElement>(null);
  const uploadRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const map: Record<string, string> = {};
    MOCK_MEDS.forEach(m => { map[m.generic_name] = loadNotes(m.generic_name); });
    setNotesMap(map);
  }, []);

  useEffect(() => {
    if (!showAddMenu) return;
    function onOutsideClick(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, [showAddMenu]);

  async function handleImageCapture(file: File) {
    setShowAddMenu(false);
    setScanning(true);
    try {
      const base64 = await fileToBase64(file);
      const med = await scanPillBottle(base64, file.type || 'image/jpeg');
      sessionStorage.setItem('lastScan', JSON.stringify(med));
      navigate('/pill-card');
    } catch (err) {
      console.error('[Pill Pal] Scan error from Medications:', err);
    } finally {
      setScanning(false);
    }
  }

  function handleNotesChange(genericName: string, text: string) {
    setNotesMap(prev => ({ ...prev, [genericName]: text }));
    saveNotes(genericName, text);
  }

  const n = MOCK_MEDS.length;

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
    const others = MOCK_MEDS.map((_, i) => i).filter(i => i !== selectedIndex);
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

  return (
    <div className="min-h-screen pb-24 lg:pb-8 px-4 pt-10 lg:pt-12" style={{ backgroundColor: '#F5F8FF' }}>
      <div className="w-full max-w-[520px] mx-auto">

        {/* Hidden file inputs */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageCapture(f); e.target.value = ''; }}
        />
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageCapture(f); e.target.value = ''; }}
        />

        {/* Header */}
        <header className="mb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[24px] font-bold" style={{ color: '#0C447C' }}>My Medications</h1>
              <p className="text-[14px] mt-0.5" style={{ color: '#378ADD' }}>
                {MOCK_MEDS.length} medications scanned
              </p>
            </div>

            {/* Add button + dropdown */}
            <div className="relative shrink-0 pt-1" ref={addMenuRef}>
              <button
                type="button"
                onClick={() => setShowAddMenu(v => !v)}
                disabled={scanning}
                className="flex items-center gap-1.5 px-3.5 rounded-full font-semibold text-[14px] text-white disabled:opacity-60 transition-transform active:scale-95"
                style={{ backgroundColor: '#185FA5', height: 36 }}
              >
                {scanning ? (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.6" strokeOpacity="0.3" />
                    <path d="M7 1.5C4 1.5 1.5 4 1.5 7" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 2V12M2 7H12" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                )}
                {scanning ? 'Scanning…' : 'Add'}
              </button>

              {/* Dropdown */}
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  width: 230,
                  backgroundColor: '#fff',
                  borderRadius: 18,
                  border: '0.5px solid #D6E4F7',
                  boxShadow: '0 8px 36px rgba(12,68,124,0.18)',
                  overflow: 'hidden',
                  zIndex: 50,
                  opacity: showAddMenu ? 1 : 0,
                  transform: showAddMenu ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.96)',
                  transformOrigin: 'top right',
                  pointerEvents: showAddMenu ? 'all' : 'none',
                  transition: 'opacity 0.16s ease, transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <AddMenuOption
                  icon={<PencilMenuIcon />}
                  label="Add manually"
                  sub="Type in med details"
                  onClick={() => { setShowAddMenu(false); console.log('[Pill Pal] Manual add — coming soon'); }}
                />
                <div style={{ height: '0.5px', backgroundColor: '#D6E4F7', margin: '0 14px' }} />
                <AddMenuOption
                  icon={<UploadMenuIcon />}
                  label="Upload photo"
                  sub="From your camera roll"
                  onClick={() => { setShowAddMenu(false); uploadRef.current?.click(); }}
                />
                <div style={{ height: '0.5px', backgroundColor: '#D6E4F7', margin: '0 14px' }} />
                <AddMenuOption
                  icon={<CameraMenuIcon />}
                  label="Camera"
                  sub="Point at pill bottle"
                  onClick={() => { setShowAddMenu(false); cameraRef.current?.click(); }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Conflict banner */}
        <ConflictAlert conflicts={MOCK_CONFLICTS} />

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
              {MOCK_MEDS.map((med, i) => {
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
                              onClose={handleClose}
                              onViewFull={e => { e.stopPropagation(); navigate('/pill-card'); }}
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
            {MOCK_MEDS.map((med, i) => (
              <button
                key={med.generic_name}
                type="button"
                onClick={() => navigate('/pill-card')}
                className="text-left w-full overflow-hidden active:scale-[0.97] transition-transform duration-100"
                style={{ borderRadius: 22, boxShadow: '0 2px 14px rgba(12,68,124,0.10)' }}
              >
                <CompactCard med={med} color={CARD_COLORS[i % CARD_COLORS.length]} />
              </button>
            ))}
          </div>
        )}

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
  med, color, notes, onClose, onViewFull,
}: {
  med: MedData;
  color: string;
  notes: string;
  onClose: (e: React.MouseEvent) => void;
  onViewFull: (e: React.MouseEvent) => void;
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

function ExpandedBack({
  med, color, notes, onNotesChange, onClose,
}: {
  med: MedData;
  color: string;
  notes: string;
  onNotesChange: (text: string) => void;
  onClose: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="flex flex-col" style={{ height: EXPANDED_H, backgroundColor: color }}>
      <div className="flex items-center justify-between px-5 shrink-0" style={{ height: HEADER_H }}>
        <div>
          <p className="text-white font-bold text-[16px]">{med.generic_name}</p>
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.6)' }}>My information</p>
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
        <BackRow label="Next dose" value="8:00 PM" sub="Evening · in 4h 32m" />
        <div style={{ height: '0.5px', backgroundColor: '#D6E4F7', margin: '0 16px' }} />
        <BackRow label="Frequency" value={med.frequency} />
        <div style={{ height: '0.5px', backgroundColor: '#D6E4F7', margin: '0 16px' }} />

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

function BackRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 shrink-0">
      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#378ADD' }}>{label}</p>
      <div className="text-right">
        <p className="text-[14px] font-semibold" style={{ color: '#0C447C' }}>{value}</p>
        {sub && <p className="text-[12px]" style={{ color: '#9CA3AF' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Add-menu helpers ─────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function AddMenuOption({
  icon, label, sub, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left"
      style={{ backgroundColor: 'transparent' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F5F8FF')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: '#EFF6FF' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold leading-tight" style={{ color: '#0C447C' }}>{label}</p>
        <p className="text-[12px] mt-0.5" style={{ color: '#378ADD' }}>{sub}</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
        <path d="M5 3L9 7L5 11" stroke="#D6E4F7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function PencilMenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M13 2L16 5L6 15H3V12L13 2Z" stroke="#185FA5" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function UploadMenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2V11M5.5 5.5L9 2L12.5 5.5" stroke="#185FA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 13V15C3 15.55 3.45 16 4 16H14C14.55 16 15 15.55 15 15V13" stroke="#185FA5" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CameraMenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17 14C17 14.8 16.3 15.5 15.5 15.5H2.5C1.7 15.5 1 14.8 1 14V6C1 5.2 1.7 4.5 2.5 4.5H5L6.5 2.5H11.5L13 4.5H15.5C16.3 4.5 17 5.2 17 6V14Z"
        stroke="#185FA5" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="9" cy="9.5" r="2.5" stroke="#185FA5" strokeWidth="1.5" />
    </svg>
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
