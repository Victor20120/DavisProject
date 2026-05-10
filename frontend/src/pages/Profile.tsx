import { useState, useEffect, useId } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, saveHealthProfile, type HealthProfile, type DetailedMed } from '../database/firestore';

// ─── Static option lists ──────────────────────────────────────────────────────

const PRESET_CONDITIONS = [
  'Heart disease', 'Diabetes', 'High blood pressure',
  'Kidney disease', 'Liver disease', 'Asthma',
  'Arthritis', 'Thyroid issues', 'Depression / Anxiety',
  'Stroke history', 'COPD', 'Osteoporosis', 'Cancer',
];

const ALLERGY_OPTIONS = [
  'Penicillin', 'Sulfa drugs', 'Aspirin', 'Codeine',
  'Ibuprofen', 'NSAIDs', 'Latex', 'No known allergies',
];

const DIET_OPTIONS = [
  'Low sodium', 'Low potassium', 'Low fat', 'Diabetic',
  'Vegan / Vegetarian', 'Gluten-free', 'Renal diet',
];

// ─── Edit state ───────────────────────────────────────────────────────────────

interface MedForm { name: string; dosage: string; frequency: string }

interface EditState {
  age: string;
  sex: string;
  weightLbs: string;
  conditions: string[];
  conditionInput: string;
  medsDetailed: DetailedMed[];
  medForm: MedForm;
  showMedForm: boolean;
  allergies: string[];
  otherAllergies: string;
  alcoholUse: string;
  tobaccoUse: string;
  exerciseLevel: string;
  dietRestrictions: string[];
  grapefruitConsumer: boolean;
  takesSupplements: boolean;
}

const BLANK_MED_FORM: MedForm = { name: '', dosage: '', frequency: '' };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Profile() {
  const { user }                = useAuth();
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [rawProfile, setRawProfile] = useState<HealthProfile | null>(null);

  const [e, setE] = useState<EditState>({
    age: '', sex: '', weightLbs: '',
    conditions: [], conditionInput: '',
    medsDetailed: [], medForm: BLANK_MED_FORM, showMedForm: false,
    allergies: [], otherAllergies: '',
    alcoholUse: '', tobaccoUse: '', exerciseLevel: '',
    dietRestrictions: [], grapefruitConsumer: false, takesSupplements: false,
  });

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid)
      .then(p => {
        setRawProfile(p);
        if (p) {
          setE(prev => ({
            ...prev,
            age:              p.age ?? '',
            sex:              p.sex ?? '',
            weightLbs:        p.weightLbs ?? '',
            conditions:       p.conditions ?? [],
            medsDetailed:     p.currentMedsDetailed ?? [],
            allergies:        p.allergies ?? [],
            otherAllergies:   p.otherAllergies ?? '',
            alcoholUse:       p.alcoholUse ?? '',
            tobaccoUse:       p.tobaccoUse ?? '',
            exerciseLevel:    p.exerciseLevel ?? '',
            dietRestrictions: p.dietRestrictions ?? [],
            grapefruitConsumer: p.grapefruitConsumer ?? false,
            takesSupplements:   p.takesSupplements ?? false,
          }));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  function patch(p: Partial<EditState>) { setE(prev => ({ ...prev, ...p })); }
  function patchMedForm(p: Partial<MedForm>) { setE(prev => ({ ...prev, medForm: { ...prev.medForm, ...p } })); }

  function toggleCondition(val: string) {
    setE(prev => ({
      ...prev,
      conditions: prev.conditions.includes(val)
        ? prev.conditions.filter(c => c !== val)
        : [...prev.conditions, val],
    }));
  }

  function addCustomCondition() {
    const val = e.conditionInput.trim();
    if (!val || e.conditions.includes(val)) { patch({ conditionInput: '' }); return; }
    patch({ conditions: [...e.conditions, val], conditionInput: '' });
  }

  function addMed() {
    const name = e.medForm.name.trim();
    if (!name) return;
    const newMed: DetailedMed = {
      name,
      dosage:    e.medForm.dosage.trim(),
      frequency: e.medForm.frequency.trim(),
    };
    patch({ medsDetailed: [...e.medsDetailed, newMed], medForm: BLANK_MED_FORM, showMedForm: false });
  }

  function removeMed(idx: number) {
    patch({ medsDetailed: e.medsDetailed.filter((_, i) => i !== idx) });
  }

  function toggleAllergy(val: string) {
    const exclusive = 'No known allergies';
    setE(prev => {
      if (val === exclusive) return { ...prev, allergies: [exclusive] };
      const list = prev.allergies.filter(a => a !== exclusive);
      return {
        ...prev,
        allergies: list.includes(val) ? list.filter(a => a !== val) : [...list, val],
      };
    });
  }

  function toggleDiet(val: string) {
    setE(prev => ({
      ...prev,
      dietRestrictions: prev.dietRestrictions.includes(val)
        ? prev.dietRestrictions.filter(d => d !== val)
        : [...prev.dietRestrictions, val],
    }));
  }

  async function handleSave() {
    if (!user || !rawProfile) return;
    setSaving(true);
    setSaved(false);
    try {
      await saveHealthProfile(user.uid, {
        displayName:        rawProfile.displayName,
        email:              rawProfile.email,
        age:                e.age,
        sex:                e.sex,
        weightLbs:          e.weightLbs,
        conditions:         e.conditions,
        currentMeds:        e.medsDetailed.map(m => m.name),
        currentMedsDetailed: e.medsDetailed,
        allergies:          e.allergies,
        otherAllergies:     e.otherAllergies,
        lifestyle:          [],
        diet:               e.dietRestrictions.join(', '),
        alcoholUse:         e.alcoholUse,
        tobaccoUse:         e.tobaccoUse,
        exerciseLevel:      e.exerciseLevel,
        dietRestrictions:   e.dietRestrictions,
        grapefruitConsumer: e.grapefruitConsumer,
        takesSupplements:   e.takesSupplements,
        reminderPref:       rawProfile.reminderPref ?? '',
        reminderEmail:      rawProfile.reminderEmail ?? '',
        onboardingComplete: true,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('[Pal] Profile save error:', err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  const firstName = user?.displayName?.split(' ')[0] ?? 'You';
  const initials  = (user?.displayName ?? '?')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen pb-32 px-4" style={{ backgroundColor: '#F5F8FF' }}>

      {/* Header */}
      <header className="px-1 pt-12 pb-6">
        <h1 className="text-[28px] font-bold" style={{ color: '#0C447C' }}>My Profile</h1>
        <p className="text-[15px] mt-1" style={{ color: '#378ADD' }}>
          Your health persona — edit and save at any time
        </p>
      </header>

      {/* Avatar card */}
      <div className="card flex items-center gap-4 px-5 py-5 mb-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 text-[20px] font-bold text-white"
          style={{ backgroundColor: '#0C447C' }}
        >
          {initials}
        </div>
        <div>
          <p className="text-[18px] font-bold" style={{ color: '#0C447C' }}>{user?.displayName ?? 'Your Name'}</p>
          <p className="text-[14px]" style={{ color: '#378ADD' }}>{user?.email}</p>
        </div>
      </div>

      {/* ── Basic Info ── */}
      <Section label="Basic Info">
        <Field label="Age" type="number" placeholder="e.g. 68" value={e.age} onChange={v => patch({ age: v })} />
        <Field label="Weight (lbs)" type="number" placeholder="e.g. 160" value={e.weightLbs} onChange={v => patch({ weightLbs: v })} />
        <div>
          <p className="field-label">Sex</p>
          <ToggleGroup
            options={['Male', 'Female', 'Prefer not to say']}
            value={e.sex}
            onSelect={v => patch({ sex: e.sex === v ? '' : v })}
          />
        </div>
      </Section>

      {/* ── Health Conditions ── */}
      <Section label="Health Conditions">
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESET_CONDITIONS.map(c => (
            <Chip key={c} label={c} selected={e.conditions.includes(c)} onToggle={() => toggleCondition(c)} />
          ))}
          {/* Custom conditions added by user */}
          {e.conditions.filter(c => !PRESET_CONDITIONS.includes(c)).map(c => (
            <Chip key={c} label={c} selected onToggle={() => toggleCondition(c)} removable />
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={e.conditionInput}
            onChange={ev => patch({ conditionInput: ev.target.value })}
            onKeyDown={ev => ev.key === 'Enter' && addCustomCondition()}
            placeholder="Add your own condition…"
            className="input-base flex-1"
          />
          <button type="button" onClick={addCustomCondition} className="btn-add">Add</button>
        </div>
      </Section>

      {/* ── Pre-existing Medications ── */}
      <Section label="Pre-existing Medications" sub="Medications you were already taking — not ones scanned in Pal">
        {e.medsDetailed.length > 0 && (
          <div className="flex flex-col gap-3 mb-4">
            {e.medsDetailed.map((med, idx) => (
              <MedCard key={idx} med={med} onRemove={() => removeMed(idx)} />
            ))}
          </div>
        )}

        {e.showMedForm ? (
          <div className="flex flex-col gap-3 p-4 rounded-[16px]" style={{ backgroundColor: '#F5F8FF', border: '1px dashed #D6E4F7' }}>
            <Field label="Medication name" type="text" placeholder="e.g. Aspirin" value={e.medForm.name} onChange={v => patchMedForm({ name: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dosage" type="text" placeholder="e.g. 81mg" value={e.medForm.dosage} onChange={v => patchMedForm({ dosage: v })} />
              <Field label="Frequency" type="text" placeholder="e.g. Once daily" value={e.medForm.frequency} onChange={v => patchMedForm({ frequency: v })} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={addMed}
                className="flex-1 font-semibold text-[14px] text-white rounded-[12px]"
                style={{ height: 44, backgroundColor: '#185FA5' }}>
                Save medication
              </button>
              <button type="button" onClick={() => patch({ showMedForm: false, medForm: BLANK_MED_FORM })}
                className="font-semibold text-[14px] px-4 rounded-[12px]"
                style={{ height: 44, border: '1px solid #D6E4F7', color: '#9CA3AF' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => patch({ showMedForm: true })}
            className="w-full flex items-center justify-center gap-2 font-semibold text-[15px] rounded-[12px]"
            style={{ height: 48, border: '1.5px dashed #D6E4F7', color: '#378ADD' }}>
            <PlusIcon /> Add medication
          </button>
        )}
      </Section>

      {/* ── Drug Allergies ── */}
      <Section label="Drug Allergies">
        <div className="flex flex-wrap gap-2 mb-4">
          {ALLERGY_OPTIONS.map(a => (
            <Chip key={a} label={a} selected={e.allergies.includes(a)} onToggle={() => toggleAllergy(a)} />
          ))}
        </div>
        <Field label="Other allergies" type="text" placeholder="e.g. Latex, shellfish…"
          value={e.otherAllergies} onChange={v => patch({ otherAllergies: v })} />
      </Section>

      {/* ── Lifestyle ── */}
      <Section label="Lifestyle" sub="Helps Pal flag dangerous interactions and tailor advice">

        <LifestyleGroup label="Alcohol use">
          <ToggleGroup
            options={['None', 'Occasionally', 'Daily']}
            value={e.alcoholUse}
            onSelect={v => patch({ alcoholUse: e.alcoholUse === v ? '' : v })}
          />
          {e.alcoholUse === 'Occasionally' || e.alcoholUse === 'Daily' ? (
            <InfoNote>Alcohol can intensify the effects of sedatives, painkillers, and blood thinners.</InfoNote>
          ) : null}
        </LifestyleGroup>

        <LifestyleGroup label="Tobacco use">
          <ToggleGroup
            options={['Non-smoker', 'Former smoker', 'Current smoker']}
            value={e.tobaccoUse}
            onSelect={v => patch({ tobaccoUse: e.tobaccoUse === v ? '' : v })}
          />
          {e.tobaccoUse === 'Current smoker' ? (
            <InfoNote>Smoking affects how quickly your body processes many medications including blood thinners and asthma inhalers.</InfoNote>
          ) : null}
        </LifestyleGroup>

        <LifestyleGroup label="Physical activity">
          <ToggleGroup
            options={['Sedentary', 'Light', 'Moderate', 'Active']}
            value={e.exerciseLevel}
            onSelect={v => patch({ exerciseLevel: e.exerciseLevel === v ? '' : v })}
          />
        </LifestyleGroup>

        <LifestyleGroup label="Diet restrictions" sub="Select all that apply">
          <div className="flex flex-wrap gap-2">
            {DIET_OPTIONS.map(d => (
              <Chip key={d} label={d} selected={e.dietRestrictions.includes(d)} onToggle={() => toggleDiet(d)} />
            ))}
          </div>
          {(e.dietRestrictions.includes('Low potassium') || e.dietRestrictions.includes('Renal diet')) ? (
            <InfoNote>Important: some medications significantly affect potassium levels. We'll flag these for you.</InfoNote>
          ) : null}
        </LifestyleGroup>

        <LifestyleGroup label="Other factors">
          <ToggleRow
            label="I regularly consume grapefruit or grapefruit juice"
            sub="Grapefruit interacts with over 85 medications — we'll warn you when relevant"
            checked={e.grapefruitConsumer}
            onToggle={() => patch({ grapefruitConsumer: !e.grapefruitConsumer })}
          />
          <ToggleRow
            label="I take vitamins or dietary supplements regularly"
            sub="Some supplements reduce or increase drug effectiveness"
            checked={e.takesSupplements}
            onToggle={() => patch({ takesSupplements: !e.takesSupplements })}
          />
        </LifestyleGroup>

      </Section>

      {/* Save button */}
      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="w-full font-bold text-[16px] text-white transition-all active:scale-[0.98] disabled:opacity-60 mt-2"
        style={{
          minHeight: 56, borderRadius: 100,
          backgroundColor: saved ? '#16A34A' : '#0C447C',
        }}
      >
        {saving ? 'Saving…' : saved ? 'Saved!' : `Save ${firstName}'s Profile`}
      </button>

    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="w-full overflow-hidden mb-4 rounded-[20px] bg-white"
      style={{ border: '0.5px solid #D6E4F7' }}>
      <div className="px-5 pt-4 pb-3">
        <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: '#378ADD' }}>{label}</p>
        {sub && <p className="text-[13px] mt-0.5" style={{ color: '#9CA3AF' }}>{sub}</p>}
      </div>
      <div style={{ height: '0.5px', backgroundColor: '#D6E4F7' }} />
      <div className="px-5 py-4 flex flex-col gap-4">{children}</div>
    </div>
  );
}

function LifestyleGroup({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] font-bold" style={{ color: '#0C447C' }}>{label}</p>
      {sub && <p className="text-[13px]" style={{ color: '#9CA3AF' }}>{sub}</p>}
      {children}
    </div>
  );
}

function ToggleGroup({ options, value, onSelect }: {
  options: string[]; value: string; onSelect: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt)}
          className="px-4 py-2 rounded-full text-[14px] font-medium transition-all"
          style={{
            backgroundColor: value === opt ? '#0C447C' : '#F5F8FF',
            color:           value === opt ? '#fff'     : '#0C447C',
            border:          `1.5px solid ${value === opt ? '#0C447C' : '#D6E4F7'}`,
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function Chip({ label, selected, onToggle, removable }: {
  label: string; selected: boolean; onToggle: () => void; removable?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] font-medium transition-all active:scale-95"
      style={{
        backgroundColor: selected ? '#0C447C' : '#F5F8FF',
        color:           selected ? '#fff'     : '#0C447C',
        border:          `1.5px solid ${selected ? '#0C447C' : '#D6E4F7'}`,
      }}
    >
      {label}
      {removable && selected && (
        <span className="text-[12px] opacity-70 ml-0.5">×</span>
      )}
    </button>
  );
}

function ToggleRow({ label, sub, checked, onToggle }: {
  label: string; sub: string; checked: boolean; onToggle: () => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-start gap-4 cursor-pointer select-none p-4 rounded-[14px] transition-all"
      style={{ backgroundColor: checked ? '#EFF6FF' : '#F5F8FF', border: `1.5px solid ${checked ? '#185FA5' : '#D6E4F7'}` }}>
      <div className="shrink-0 mt-0.5">
        <input type="checkbox" id={id} checked={checked} onChange={onToggle} className="sr-only" />
        <div
          className="w-5 h-5 rounded-[5px] flex items-center justify-center transition-all"
          style={{ backgroundColor: checked ? '#185FA5' : '#fff', border: `1.5px solid ${checked ? '#185FA5' : '#D6E4F7'}` }}
        >
          {checked && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <div>
        <p className="text-[14px] font-semibold" style={{ color: '#0C447C' }}>{label}</p>
        <p className="text-[13px] mt-0.5" style={{ color: '#9CA3AF' }}>{sub}</p>
      </div>
    </label>
  );
}

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] px-4 py-2.5 rounded-[10px]" style={{ backgroundColor: '#FFF7ED', color: '#92400E' }}>
      {children}
    </p>
  );
}

function Field({ label, type, placeholder, value, onChange }: {
  label: string; type: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[14px] font-bold" style={{ color: '#0C447C' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full outline-none text-[15px] px-4"
        style={{
          height: 48, borderRadius: 12, border: '1.5px solid #D6E4F7',
          color: '#0C447C', fontFamily: 'inherit', caretColor: '#185FA5',
          backgroundColor: '#F5F8FF',
        }}
        onFocus={e => (e.currentTarget.style.border = '1.5px solid #185FA5')}
        onBlur={e  => (e.currentTarget.style.border = '1.5px solid #D6E4F7')}
      />
    </div>
  );
}

function MedCard({ med, onRemove }: { med: DetailedMed; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 rounded-[14px]"
      style={{ backgroundColor: '#F5F8FF', border: '0.5px solid #D6E4F7' }}>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold truncate" style={{ color: '#0C447C' }}>{med.name}</p>
        <p className="text-[13px] mt-0.5" style={{ color: '#378ADD' }}>
          {[med.dosage, med.frequency].filter(Boolean).join(' · ') || 'No dosage info'}
        </p>
      </div>
      <button type="button" onClick={onRemove}
        className="shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-full"
        style={{ color: '#DC2626', backgroundColor: '#FEF2F2' }}>
        Remove
      </button>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2V14M2 8H14" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F8FF' }}>
      <svg className="animate-spin" width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="13" stroke="#D6E4F7" strokeWidth="3" />
        <path d="M16 3C8.8 3 3 8.8 3 16" stroke="#185FA5" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
