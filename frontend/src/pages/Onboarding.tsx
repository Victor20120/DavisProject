import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { saveHealthProfile } from '../database/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  age: string;
  sex: string;
  weightLbs: string;
  conditions: string[];
  currentMeds: string[];
  medInput: string;
  allergies: string[];
  otherAllergies: string;
  lifestyle: string[];
  diet: string;
}

const TOTAL_STEPS = 5;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [step, setStep]     = useState(0);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    age: '', sex: '', weightLbs: '',
    conditions: [], currentMeds: [], medInput: '',
    allergies: [], otherAllergies: '',
    lifestyle: [], diet: '',
  });

  function patch(p: Partial<Profile>) { setProfile(prev => ({ ...prev, ...p })); }

  function toggleList(key: 'conditions' | 'allergies' | 'lifestyle', val: string, exclusive?: string) {
    setProfile(prev => {
      let list = prev[key];
      if (exclusive && val !== exclusive) list = list.filter(x => x !== exclusive);
      if (exclusive === val) return { ...prev, [key]: [val] };
      return { ...prev, [key]: list.includes(val) ? list.filter(x => x !== val) : [...list, val] };
    });
  }

  function addMed() {
    const name = profile.medInput.trim();
    if (!name || profile.currentMeds.includes(name)) { patch({ medInput: '' }); return; }
    patch({ currentMeds: [...profile.currentMeds, name], medInput: '' });
  }

  async function finish() {
    if (!user) return;
    setSaving(true);
    try {
      await saveHealthProfile(user.uid, {
        displayName:      user.displayName ?? '',
        email:            user.email ?? '',
        age:              profile.age,
        sex:              profile.sex,
        weightLbs:        profile.weightLbs,
        conditions:       profile.conditions,
        currentMeds:      profile.currentMeds,
        allergies:        profile.allergies,
        otherAllergies:   profile.otherAllergies,
        lifestyle:        profile.lifestyle,
        diet:             profile.diet,
        reminderPref:     '',
        reminderEmail:    user.email ?? '',
        onboardingComplete: true,
      });
      navigate('/');
    } catch (err) {
      console.error('[Pal] Onboarding save error:', err);
      setSaving(false);
    }
  }

  const firstName = user?.displayName?.split(' ')[0] ?? 'there';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ backgroundColor: '#F0F4FF' }}>
      <div className="w-full max-w-[440px]">

        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-full transition-all duration-300"
              style={{
                height: 4,
                backgroundColor: i <= step ? '#0C447C' : '#D6E4F7',
              }}
            />
          ))}
        </div>

        <p className="text-[12px] font-bold uppercase tracking-widest mb-2" style={{ color: '#378ADD' }}>
          Step {step + 1} of {TOTAL_STEPS}
        </p>

        {/* ── Step 0: Basic info ── */}
        {step === 0 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-[32px] font-bold leading-tight" style={{ color: '#0C447C' }}>
                Hello, {firstName}! 👋
              </h1>
              <p className="text-[16px] mt-2" style={{ color: '#378ADD' }}>
                Let's set up your health profile so we can keep you safe.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <ProfileField label="Age" type="number" placeholder="e.g. 68"
                value={profile.age} onChange={v => patch({ age: v })} />
              <ProfileField label="Weight (lbs)" type="number" placeholder="e.g. 160"
                value={profile.weightLbs} onChange={v => patch({ weightLbs: v })} />

              <div>
                <label className="text-[15px] font-bold mb-2 block" style={{ color: '#0C447C' }}>Sex</label>
                <div className="flex gap-2 flex-wrap">
                  {['Male', 'Female', 'Prefer not to say'].map(s => (
                    <Chip key={s} label={s} selected={profile.sex === s}
                      onToggle={() => patch({ sex: profile.sex === s ? '' : s })} />
                  ))}
                </div>
              </div>
            </div>

            <ContinueButton onClick={() => setStep(1)} />
          </div>
        )}

        {/* ── Step 1: Health conditions ── */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-[28px] font-bold leading-tight" style={{ color: '#0C447C' }}>
                Any health conditions?
              </h1>
              <p className="text-[15px] mt-1.5" style={{ color: '#378ADD' }}>Select all that apply</p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {[
                'Heart disease', 'Diabetes', 'High blood pressure',
                'Kidney disease', 'Liver disease', 'Asthma',
                'Arthritis', 'Thyroid issues', 'Depression / Anxiety',
                'Cancer', 'None',
              ].map(c => (
                <Chip key={c} label={c} selected={profile.conditions.includes(c)}
                  onToggle={() => toggleList('conditions', c, 'None')} />
              ))}
            </div>

            <div className="flex gap-3">
              <BackButton onClick={() => setStep(0)} />
              <ContinueButton onClick={() => setStep(2)} />
            </div>
            <SkipButton onClick={() => setStep(2)} />
          </div>
        )}

        {/* ── Step 2: Current medications ── */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-[28px] font-bold leading-tight" style={{ color: '#0C447C' }}>
                Taking any medications right now?
              </h1>
              <p className="text-[15px] mt-1.5" style={{ color: '#378ADD' }}>
                Type the names — we'll check for conflicts
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={profile.medInput}
                onChange={e => patch({ medInput: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && addMed()}
                placeholder="e.g. Aspirin, Metformin…"
                className="flex-1 outline-none text-[15px] px-4"
                style={{
                  height: 52, borderRadius: 12, border: '1.5px solid #D6E4F7',
                  color: '#0C447C', fontFamily: 'inherit', caretColor: '#185FA5',
                }}
                onFocus={e => (e.currentTarget.style.border = '1.5px solid #185FA5')}
                onBlur={e  => (e.currentTarget.style.border = '1.5px solid #D6E4F7')}
              />
              <button
                type="button"
                onClick={addMed}
                className="shrink-0 font-semibold text-[14px] text-white px-4 rounded-[12px]"
                style={{ backgroundColor: '#185FA5', height: 52 }}
              >
                Add
              </button>
            </div>

            {profile.currentMeds.length > 0 && (
              <div className="flex flex-col gap-2">
                {profile.currentMeds.map(med => (
                  <div key={med}
                    className="flex items-center justify-between px-4 py-3 rounded-[12px]"
                    style={{ backgroundColor: '#fff', border: '0.5px solid #D6E4F7' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[18px]">💊</span>
                      <span className="text-[15px] font-medium" style={{ color: '#0C447C' }}>{med}</span>
                    </div>
                    <button type="button" onClick={() => patch({ currentMeds: profile.currentMeds.filter(m => m !== med) })}
                      className="text-[13px] font-semibold px-3 py-1 rounded-full"
                      style={{ color: '#DC2626', backgroundColor: '#FEF2F2' }}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <BackButton onClick={() => setStep(1)} />
              <ContinueButton onClick={() => setStep(3)} />
            </div>
            <SkipButton onClick={() => setStep(3)} label="I don't take any" />
          </div>
        )}

        {/* ── Step 3: Allergies ── */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-[28px] font-bold leading-tight" style={{ color: '#0C447C' }}>
                Any drug allergies?
              </h1>
              <p className="text-[15px] mt-1.5" style={{ color: '#378ADD' }}>
                Select all that apply
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {['Penicillin', 'Sulfa drugs', 'Aspirin', 'Codeine', 'Ibuprofen', 'NSAIDs', 'No known allergies'].map(a => (
                <Chip key={a} label={a} selected={profile.allergies.includes(a)}
                  onToggle={() => toggleList('allergies', a, 'No known allergies')} />
              ))}
            </div>

            <div>
              <label className="text-[14px] font-semibold mb-1.5 block" style={{ color: '#0C447C' }}>
                Any other allergies?
              </label>
              <input
                type="text"
                value={profile.otherAllergies}
                onChange={e => patch({ otherAllergies: e.target.value })}
                placeholder="e.g. Latex, shellfish…"
                className="w-full outline-none text-[15px] px-4"
                style={{
                  height: 52, borderRadius: 12, border: '1.5px solid #D6E4F7',
                  color: '#0C447C', fontFamily: 'inherit', caretColor: '#185FA5',
                }}
                onFocus={e => (e.currentTarget.style.border = '1.5px solid #185FA5')}
                onBlur={e  => (e.currentTarget.style.border = '1.5px solid #D6E4F7')}
              />
            </div>

            <div className="flex gap-3">
              <BackButton onClick={() => setStep(2)} />
              <ContinueButton onClick={() => setStep(4)} />
            </div>
            <SkipButton onClick={() => setStep(4)} />
          </div>
        )}

        {/* ── Step 4: Lifestyle ── */}
        {step === 4 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-[28px] font-bold leading-tight" style={{ color: '#0C447C' }}>
                A few lifestyle questions
              </h1>
              <p className="text-[15px] mt-1.5" style={{ color: '#378ADD' }}>
                These affect how medications work in your body
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {[
                { icon: '🍷', label: 'I drink alcohol occasionally' },
                { icon: '🚬', label: 'I smoke or use tobacco' },
                { icon: '🥗', label: 'I follow a special diet' },
                { icon: '🚫', label: 'None of these' },
              ].map(({ icon, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleList('lifestyle', label, 'None of these')}
                  className="flex items-center gap-4 px-5 py-4 rounded-[16px] text-left transition-all"
                  style={{
                    backgroundColor: profile.lifestyle.includes(label) ? '#EFF6FF' : '#fff',
                    border: `1.5px solid ${profile.lifestyle.includes(label) ? '#185FA5' : '#D6E4F7'}`,
                  }}
                >
                  <span className="text-[22px]">{icon}</span>
                  <span className="text-[15px] font-medium" style={{ color: '#0C447C' }}>{label}</span>
                  {profile.lifestyle.includes(label) && (
                    <span className="ml-auto text-[16px]" style={{ color: '#185FA5' }}>✓</span>
                  )}
                </button>
              ))}
            </div>

            {profile.lifestyle.includes('I follow a special diet') && (
              <div>
                <label className="text-[14px] font-semibold mb-2 block" style={{ color: '#0C447C' }}>
                  Which diet?
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Low sodium', 'Low potassium', 'Diabetic', 'Vegan', 'Gluten-free'].map(d => (
                    <Chip key={d} label={d} selected={profile.diet === d}
                      onToggle={() => patch({ diet: profile.diet === d ? '' : d })} />
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <BackButton onClick={() => setStep(3)} />
              <button
                type="button"
                disabled={saving}
                onClick={finish}
                className="flex-1 font-bold text-[16px] text-white transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ minHeight: 52, borderRadius: 100, backgroundColor: '#0C447C' }}
              >
                {saving ? 'Saving…' : "All done →"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Chip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="px-4 py-2.5 rounded-full text-[15px] font-medium transition-all active:scale-95"
      style={{
        backgroundColor: selected ? '#0C447C' : '#fff',
        color:           selected ? '#fff'     : '#0C447C',
        border:          `1.5px solid ${selected ? '#0C447C' : '#D6E4F7'}`,
      }}
    >
      {label}
    </button>
  );
}

function ProfileField({
  label, type, placeholder, value, onChange,
}: {
  label: string; type: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[15px] font-bold" style={{ color: '#0C447C' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full outline-none text-[15px] px-4"
        style={{
          height: 52, borderRadius: 12, border: '1.5px solid #D6E4F7',
          color: '#0C447C', fontFamily: 'inherit', caretColor: '#185FA5',
        }}
        onFocus={e => (e.currentTarget.style.border = '1.5px solid #185FA5')}
        onBlur={e  => (e.currentTarget.style.border = '1.5px solid #D6E4F7')}
      />
    </div>
  );
}

function ContinueButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 font-bold text-[16px] text-white transition-all active:scale-[0.98]"
      style={{ minHeight: 52, borderRadius: 100, backgroundColor: '#185FA5' }}
    >
      Continue →
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-semibold text-[15px] transition-all active:scale-[0.98]"
      style={{
        minHeight: 52, borderRadius: 100, paddingLeft: 20, paddingRight: 20,
        border: '1.5px solid #D6E4F7', color: '#0C447C', backgroundColor: '#fff',
      }}
    >
      ←
    </button>
  );
}

function SkipButton({ onClick, label = 'Skip this step' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-center text-[14px] font-medium w-full"
      style={{ color: '#9CA3AF' }}
    >
      {label}
    </button>
  );
}
