import { useState } from 'react';

interface ReminderSetting {
  id: string;
  medName: string;
  dosage: string;
  frequency: string;
  enabled: boolean;
  times: string[];
}

const INITIAL_REMINDERS: ReminderSetting[] = [
  {
    id: '1',
    medName: 'Lisinopril',
    dosage: '10mg',
    frequency: 'Once daily',
    enabled: true,
    times: ['08:00'],
  },
  {
    id: '2',
    medName: 'Metformin',
    dosage: '500mg',
    frequency: 'Twice daily',
    enabled: true,
    times: ['08:00', '20:00'],
  },
];

export default function Settings() {
  const [reminders, setReminders] = useState(INITIAL_REMINDERS);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [email, setEmail] = useState('your@email.com');

  function toggleReminder(id: string) {
    setReminders(prev =>
      prev.map(r => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  }

  function updateTime(id: string, index: number, value: string) {
    setReminders(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        const times = [...r.times];
        times[index] = value;
        return { ...r, times };
      })
    );
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-8 px-4 pt-10 lg:pt-12" style={{ backgroundColor: '#F5F8FF' }}>

      <header className="mb-7">
        <h1 className="text-[24px] font-bold" style={{ color: '#0C447C' }}>Settings</h1>
      </header>

      {/* ── Reminders ── */}
      <Section title="Reminders">
        {reminders.map(r => (
          <div key={r.id} className="bg-white rounded-[20px] p-5"
            style={{ border: '0.5px solid #D6E4F7' }}>

            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-[16px] font-bold" style={{ color: '#0C447C' }}>
                  {r.medName} {r.dosage}
                </p>
                <p className="text-[13px]" style={{ color: '#378ADD' }}>{r.frequency}</p>
              </div>
              <Toggle on={r.enabled} onChange={() => toggleReminder(r.id)} />
            </div>

            {r.enabled && (
              <div className="mt-4 flex flex-col gap-3 pt-4"
                style={{ borderTop: '0.5px solid #D6E4F7' }}>
                {r.times.map((t, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <p className="text-[14px] font-medium" style={{ color: '#0C447C' }}>
                      {r.times.length > 1 ? (i === 0 ? 'Morning dose' : 'Evening dose') : 'Reminder time'}
                    </p>
                    <input
                      type="time"
                      value={t}
                      onChange={e => updateTime(r.id, i, e.target.value)}
                      className="rounded-[10px] px-3 py-2 text-[15px] font-semibold"
                      style={{
                        border: '1px solid #D6E4F7',
                        color: '#185FA5',
                        backgroundColor: '#F5F8FF',
                        outline: 'none',
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </Section>

      {/* ── Notifications ── */}
      <Section title="Notifications">
        <div className="bg-white rounded-[20px]" style={{ border: '0.5px solid #D6E4F7' }}>

          {/* Browser push */}
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="text-[15px] font-semibold" style={{ color: '#0C447C' }}>
                Browser notifications
              </p>
              <p className="text-[13px] mt-0.5" style={{ color: '#378ADD' }}>
                {pushEnabled ? 'You\'ll get alerts on this device' : 'Tap to enable alerts on this device'}
              </p>
            </div>
            <Toggle on={pushEnabled} onChange={() => {
              setPushEnabled(v => !v);
              console.log('[Pill Pal] Push notifications toggled');
            }} />
          </div>

          <div style={{ height: '0.5px', backgroundColor: '#D6E4F7', margin: '0 20px' }} />

          {/* Email */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[15px] font-semibold" style={{ color: '#0C447C' }}>
                  Email reminders
                </p>
                <p className="text-[13px] mt-0.5" style={{ color: '#378ADD' }}>
                  Daily digest sent each morning
                </p>
              </div>
              <Toggle on={emailEnabled} onChange={() => setEmailEnabled(v => !v)} />
            </div>
            {emailEnabled && (
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-[12px] px-4 py-3 text-[15px]"
                style={{
                  border: '1px solid #D6E4F7',
                  color: '#0C447C',
                  backgroundColor: '#F5F8FF',
                  outline: 'none',
                }}
              />
            )}
          </div>
        </div>
      </Section>

      {/* ── Family loop ── */}
      <Section title="Family loop">
        <div className="bg-white rounded-[20px] p-5" style={{ border: '0.5px solid #D6E4F7' }}>
          <p className="text-[14px] mb-4" style={{ color: '#378ADD' }}>
            Family members will be notified if you miss a dose.
          </p>
          <div className="flex flex-col gap-3 mb-4">
            {[
              { name: 'Sarah', relation: 'Daughter', color: '#185FA5' },
              { name: 'James', relation: 'Son',      color: '#0C447C' },
            ].map(m => (
              <div key={m.name} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[14px] text-white shrink-0"
                  style={{ backgroundColor: m.color }}>
                  {m.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold" style={{ color: '#0C447C' }}>{m.name}</p>
                  <p className="text-[12px]" style={{ color: '#378ADD' }}>{m.relation}</p>
                </div>
                <button type="button" className="text-[13px] font-medium" style={{ color: '#DC2626' }}
                  onClick={() => console.log('[Pill Pal] Remove', m.name)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button type="button"
            className="w-full font-semibold text-[15px]"
            style={{ minHeight: '44px', borderRadius: '100px', border: '1.5px solid #185FA5', color: '#185FA5', backgroundColor: 'white' }}
            onClick={() => console.log('[Pill Pal] Invite')}>
            + Invite someone
          </button>
        </div>
      </Section>

      {/* ── About ── */}
      <Section title="About">
        <div className="bg-white rounded-[20px] overflow-hidden" style={{ border: '0.5px solid #D6E4F7' }}>
          {[
            { label: 'App',     value: 'Pill Pal' },
            { label: 'Version', value: '1.0.0' },
            { label: 'Built for', value: 'HackDavis 2026' },
          ].map((row, i, arr) => (
            <div key={row.label}>
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-[14px]" style={{ color: '#9CA3AF' }}>{row.label}</span>
                <span className="text-[14px] font-medium" style={{ color: '#0C447C' }}>{row.value}</span>
              </div>
              {i < arr.length - 1 && (
                <div style={{ height: '0.5px', backgroundColor: '#D6E4F7', margin: '0 20px' }} />
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-bold uppercase tracking-widest mb-3 px-1"
        style={{ color: '#378ADD' }}>
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
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
