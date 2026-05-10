import { useState } from 'react';
import type { MedData } from '../types';
import type { AdviceItem } from '../services/claude';
import { useAuth } from '../contexts/AuthContext';
import { saveMed } from '../database/firestore';

interface PillCardProps {
  data: MedData;
  onOkay?: () => void;
  advice?: AdviceItem[];
  adviceLoading?: boolean;
  isAlreadySaved?: boolean;
  onSaved?: () => void;
}

export default function PillCard({ data, onOkay, advice, adviceLoading, isAlreadySaved, onSaved }: PillCardProps) {
  const { user } = useAuth();

  // draft is the source of truth for rendering — updates on save
  const [draft,      setDraft]      = useState<MedData>(data);
  const [editMode,   setEditMode]   = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const safe = draft.conflicts.length === 0;

  function patchDraft(p: Partial<MedData>) { setDraft(prev => ({ ...prev, ...p })); }

  async function handleAddToMedications() {
    if (user) await saveMed(user.uid, draft).catch(() => {});
    onSaved?.();
    onOkay?.();
  }

  async function handleSaveEdit() {
    if (!user) return;
    setEditSaving(true);
    try {
      await saveMed(user.uid, draft);
      sessionStorage.setItem('lastScan', JSON.stringify(draft));
      onSaved?.();
    } catch (err) {
      console.error('[Pal] Edit save error:', err);
    } finally {
      setEditSaving(false);
      setEditMode(false);
    }
  }

  function handleCancelEdit() {
    setDraft(data);
    setEditMode(false);
  }

  return (
    <div className="w-full overflow-hidden" style={{ borderRadius: '20px' }}>

      {/* ── Navy header ── */}
      <div className="px-5 pt-6 pb-5" style={{ backgroundColor: '#0C447C' }}>
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-[12px] flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#185FA5' }}>
            <PillIconWhite />
          </div>
          <div>
            <h2 className="text-[22px] font-bold text-white leading-tight">{draft.common_name}</h2>
            <p className="text-[14px] mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {draft.generic_name} · {draft.dosage} · {draft.form}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {safe ? (
            <HeaderTag label="Safe to take" color="#16A34A" bg="rgba(22,163,74,0.18)" />
          ) : (
            draft.conflicts.map((c, i) => (
              <HeaderTag key={i} label={c} color="#FCD34D" bg="rgba(180,130,0,0.25)" />
            ))
          )}
          <HeaderTag label={draft.frequency} color="rgba(255,255,255,0.9)" bg="rgba(255,255,255,0.12)" />
          {draft.take_with_food && (
            <HeaderTag label="Take with food" color="#FCD34D" bg="rgba(180,130,0,0.25)" />
          )}
        </div>
      </div>

      {/* ── White body — block pointer events so buttons don't trigger card flip ── */}
      <div
        className="bg-white"
        style={{ border: '0.5px solid #D6E4F7', borderTop: 'none' }}
        onPointerDown={e => e.stopPropagation()}
        onPointerUp={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        onTouchEnd={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >

        {editMode ? (
          /* ── Edit form ── */
          <div className="px-5 py-5 flex flex-col gap-4">
            <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: '#378ADD' }}>
              Edit Medication
            </p>

            <EditField label="Common name"       value={draft.common_name}       onChange={v => patchDraft({ common_name: v })} />
            <EditField label="Generic name"      value={draft.generic_name}      onChange={v => patchDraft({ generic_name: v })} />
            <div className="grid grid-cols-2 gap-3">
              <EditField label="Dosage"    value={draft.dosage}    onChange={v => patchDraft({ dosage: v })} />
              <EditField label="Frequency" value={draft.frequency} onChange={v => patchDraft({ frequency: v })} />
            </div>
            <EditField label="Drug class"        value={draft.drug_class}        onChange={v => patchDraft({ drug_class: v })} />
            <EditField label="Active ingredient" value={draft.active_ingredient} onChange={v => patchDraft({ active_ingredient: v })} />
            <EditField label="Common side effects" value={draft.common_effects}    onChange={v => patchDraft({ common_effects: v })} />
            <EditField label="Manufacturer"      value={draft.manufacturer}      onChange={v => patchDraft({ manufacturer: v })} />
            <EditTextarea
              label="How to take it"
              value={draft.how_to_take}
              onChange={v => patchDraft({ how_to_take: v })}
            />

            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={draft.take_with_food}
                  onChange={e => patchDraft({ take_with_food: e.target.checked })}
                  className="w-4 h-4 accent-[#185FA5]"
                />
                <span className="text-[14px] font-medium" style={{ color: '#0C447C' }}>Take with food</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={editSaving}
                onClick={handleSaveEdit}
                className="flex-1 font-semibold text-[15px] text-white transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ minHeight: 52, borderRadius: 100, backgroundColor: '#185FA5' }}
              >
                {editSaving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="font-semibold text-[15px] px-5 transition-all active:scale-[0.98]"
                style={{ minHeight: 52, borderRadius: 100, border: '1.5px solid #D6E4F7', color: '#9CA3AF' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* ── Normal view ── */
          <>
            <div className="px-5 pt-5 pb-4">
              <p className="text-[12px] font-bold uppercase tracking-widest mb-4" style={{ color: '#378ADD' }}>
                About this medication
              </p>
              <div className="flex flex-col gap-3.5">
                <InfoRow label="Drug class"        value={draft.drug_class} />
                <InfoRow label="Active ingredient" value={draft.active_ingredient} />
                <InfoRow label="Common side effects" value={draft.common_effects} />
                <InfoRow label="Manufacturer"      value={draft.manufacturer} />
              </div>
            </div>

            <div className="mx-5 h-px" style={{ backgroundColor: '#D6E4F7' }} />

            <div className="px-5 pt-4 pb-5">
              <p className="text-[12px] font-bold uppercase tracking-widest mb-3" style={{ color: '#378ADD' }}>
                How to take it
              </p>
              <div className="p-4 rounded-[12px]" style={{ backgroundColor: '#F5F8FF' }}>
                <p className="text-[16px] leading-relaxed" style={{ color: '#0C447C' }}>
                  {draft.how_to_take}
                </p>
              </div>
            </div>

            {/* Tailored advice */}
            {(adviceLoading || (advice && advice.length > 0)) && (
              <>
                <div className="mx-5 h-px" style={{ backgroundColor: '#D6E4F7' }} />
                <div className="px-5 pt-4 pb-5">
                  <p className="text-[12px] font-bold uppercase tracking-widest mb-3" style={{ color: '#378ADD' }}>
                    Tailored for you
                  </p>
                  {adviceLoading ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-3">
                      <svg className="animate-spin" width="36" height="36" viewBox="0 0 36 36" fill="none">
                        <circle cx="18" cy="18" r="15" stroke="#D6E4F7" strokeWidth="3" />
                        <path d="M18 3C9.716 3 3 9.716 3 18" stroke="#185FA5" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      <p className="text-[13px] font-medium" style={{ color: '#378ADD' }}>
                        Reviewing your profile…
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {advice!.map((item, idx) => <AdviceCard key={idx} item={item} />)}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 px-5 pb-5">
              {!isAlreadySaved && (
                <button
                  type="button"
                  onClick={handleAddToMedications}
                  className="flex-1 font-semibold text-[16px] text-white transition-all active:scale-[0.98]"
                  style={{ minHeight: 52, borderRadius: 100, backgroundColor: '#185FA5' }}
                >
                  Add to Medications
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="flex-1 font-semibold text-[16px] transition-all active:scale-[0.98]"
                style={{
                  minHeight: 52, borderRadius: 100,
                  border: '1.5px solid #185FA5', color: '#185FA5', backgroundColor: 'white',
                }}
              >
                Edit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-bold" style={{ color: '#0C447C' }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full outline-none text-[14px] px-3"
        style={{
          height: 44, borderRadius: 10, border: '1.5px solid #D6E4F7',
          color: '#0C447C', fontFamily: 'inherit', caretColor: '#185FA5',
          backgroundColor: '#F5F8FF',
        }}
        onFocus={e => (e.currentTarget.style.border = '1.5px solid #185FA5')}
        onBlur={e  => (e.currentTarget.style.border = '1.5px solid #D6E4F7')}
      />
    </div>
  );
}

function EditTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-bold" style={{ color: '#0C447C' }}>{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        className="w-full outline-none text-[14px] px-3 py-3 resize-none"
        style={{
          borderRadius: 10, border: '1.5px solid #D6E4F7',
          color: '#0C447C', fontFamily: 'inherit', caretColor: '#185FA5',
          backgroundColor: '#F5F8FF',
        }}
        onFocus={e => (e.currentTarget.style.border = '1.5px solid #185FA5')}
        onBlur={e  => (e.currentTarget.style.border = '1.5px solid #D6E4F7')}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[14px] shrink-0" style={{ color: '#9CA3AF' }}>{label}</span>
      <span className="text-[15px] font-medium text-right" style={{ color: '#0C447C' }}>{value}</span>
    </div>
  );
}

function HeaderTag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span className="text-[12px] font-semibold px-3 py-1 rounded-full" style={{ color, backgroundColor: bg }}>
      {label}
    </span>
  );
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; titleColor: string; bodyColor: string; dot: string }> = {
  critical:      { bg: '#FEF2F2', border: '#FECACA', titleColor: '#B91C1C', bodyColor: '#7F1D1D', dot: '#EF4444' },
  moderate:      { bg: '#FFFBEB', border: '#FDE68A', titleColor: '#92400E', bodyColor: '#78350F', dot: '#F59E0B' },
  informational: { bg: '#EFF6FF', border: '#BFDBFE', titleColor: '#1D4ED8', bodyColor: '#1E3A5F', dot: '#3B82F6' },
};

function AdviceCard({ item }: { item: AdviceItem }) {
  const s = SEVERITY_STYLES[item.severity] ?? SEVERITY_STYLES.informational;
  return (
    <div className="flex gap-3 p-4 rounded-[12px]"
      style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}>
      <span className="mt-1.5 shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: s.dot }} />
      <div>
        <p className="text-[14px] font-bold leading-snug" style={{ color: s.titleColor }}>{item.title}</p>
        <p className="text-[13px] mt-1 leading-relaxed" style={{ color: s.bodyColor }}>{item.body}</p>
      </div>
    </div>
  );
}

function PillIconWhite() {
  return (
    <svg width="26" height="26" viewBox="0 0 22 22" fill="none">
      <rect x="4" y="8" width="14" height="6" rx="3"
        transform="rotate(-45 11 11)"
        stroke="white" strokeWidth="1.5" fill="none" />
      <line x1="8.5" y1="8.5" x2="13.5" y2="13.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
