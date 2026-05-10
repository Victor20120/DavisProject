import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ScanButton from '../components/ScanButton';
import ScanningOverlay from '../components/ScanningOverlay';
import { scanPillBottle } from '../services/api';
import type { MedData } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { onMedsChanged, saveMed, onFamilyChanged, type FamilyMember } from '../database/firestore';

function fmt12(hhmm: string) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export default function Home() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const [scanning,    setScanning]    = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [cameraOpen,  setCameraOpen]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [recentMeds, setRecentMeds] = useState<(MedData & { reminderTime: string })[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubMeds   = onMedsChanged(user.uid, meds => setRecentMeds(meds.slice(0, 4)));
    const unsubFamily = onFamilyChanged(user.uid, setFamilyMembers);
    return () => { unsubMeds(); unsubFamily(); };
  }, [user]);

  // Find the next upcoming reminder from user's meds
  const nextReminder = (() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const candidates = recentMeds
      .filter(m => m.reminderTime)
      .map(m => {
        const [h, min] = m.reminderTime.split(':').map(Number);
        return { med: m, minutes: h * 60 + min };
      })
      .sort((a, b) => {
        const aNext = a.minutes >= nowMinutes ? a.minutes : a.minutes + 1440;
        const bNext = b.minutes >= nowMinutes ? b.minutes : b.minutes + 1440;
        return aNext - bNext;
      });
    return candidates[0] ?? null;
  })();

  async function handleImageCapture(base64: string, mediaType: string) {
    setScanning(true);
    setError(null);
    try {
      const med = await scanPillBottle(base64, mediaType);
      sessionStorage.setItem('lastScan', JSON.stringify(med));
      if (user) await saveMed(user.uid, med);
      // Flash "Got it!" for 1.5s before navigating
      setScanning(false);
      setScanSuccess(true);
      setTimeout(() => navigate('/pill-card'), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Scan failed. Please try again.';
      setError(msg);
      setScanning(false);
      console.error('[Pill Pal] Scan error:', err);
    }
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-8 px-4 pt-10 lg:pt-12" style={{ backgroundColor: '#F5F8FF' }}>
      {/* Overlay for file uploads only (camera has its own viewfinder UI) */}
      {scanning && !cameraOpen && <ScanningOverlay />}

      {/* Logo — mobile + tablet only (sidebar has it on desktop) */}
      <div className="flex items-center gap-2 mb-7 lg:hidden">
        <CapsuleIcon />
        <span className="text-[28px] font-bold tracking-tight" style={{ color: '#0C447C' }}>Pal</span>
      </div>

      {/* Two-column layout on desktop */}
      <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-6 lg:items-start">

        {/* ── Left / center column ── */}
        <div className="flex flex-col gap-5">
          <ScanButton onImageCapture={handleImageCapture} isScanning={scanning} isSuccess={scanSuccess} onCameraToggle={setCameraOpen} />

          {error && (
            <div className="rounded-[14px] px-4 py-3 flex items-center gap-3"
              style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }}>
              <span className="text-[18px]">⚠️</span>
              <p className="text-[14px] font-medium" style={{ color: '#991B1B' }}>{error}</p>
            </div>
          )}

          {/* Recently scanned */}
          <section>
            <h2 className="text-[16px] font-semibold mb-3" style={{ color: '#0C447C' }}>
              Recently scanned
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentMeds.map(med => (
                <RecentMedCard key={med.generic_name} med={med} />
              ))}
            </div>
          </section>
        </div>

        {/* ── Right panel — desktop only ── */}
        <aside className="hidden lg:flex flex-col gap-4">

          {/* Family loop widget */}
          <div className="bg-white rounded-[20px] p-5" style={{ border: '0.5px solid #D6E4F7' }}>
            <h3 className="text-[15px] font-bold mb-4" style={{ color: '#0C447C' }}>Family loop</h3>
            {familyMembers.length === 0 ? (
              <p className="text-[13px]" style={{ color: '#9CA3AF' }}>No family members yet</p>
            ) : (
              <div className="flex flex-col gap-3">
                {familyMembers.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[14px] text-white shrink-0"
                      style={{ backgroundColor: i % 2 === 0 ? '#185FA5' : '#0C447C' }}>
                      {m.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-semibold" style={{ color: '#0C447C' }}>{m.name}</p>
                      <p className="text-[12px]" style={{ color: '#378ADD' }}>{m.relation}</p>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Next reminder widget */}
          <div className="rounded-[20px] p-5 text-white" style={{ backgroundColor: '#185FA5' }}>
            <p className="text-[13px] font-semibold opacity-80 mb-1">Next reminder</p>
            {nextReminder ? (
              <>
                <p className="text-[14px] opacity-70">{nextReminder.med.generic_name} {nextReminder.med.dosage}</p>
                <p className="text-[32px] font-bold mt-1 leading-none">{fmt12(nextReminder.med.reminderTime)}</p>
              </>
            ) : (
              <p className="text-[18px] font-semibold mt-1 opacity-80">No reminders set</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function RecentMedCard({ med }: { med: MedData }) {
  const safe = med.conflicts.length === 0;
  return (
    <div className="bg-white rounded-[16px] p-4 flex flex-col gap-2" style={{ border: '0.5px solid #D6E4F7' }}>
      <p className="text-[17px] font-bold leading-tight" style={{ color: '#0C447C' }}>
        {med.generic_name} {med.dosage}
      </p>
      <p className="text-[13px] leading-snug" style={{ color: '#378ADD' }}>
        {med.how_to_take}
      </p>
      <div className="flex flex-wrap gap-1.5 mt-1">
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: safe ? '#F0FDF4' : '#FEF2F2', color: safe ? '#16A34A' : '#DC2626' }}>
          {safe ? '✓ Safe' : '⚠ Conflict'}
        </span>
        {med.conflicts.map((conflict, i) => (
          <span key={i} className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: '#FFFBEB', color: '#92400E' }}>
            ⚠ {conflict}
          </span>
        ))}
      </div>
    </div>
  );
}

function CapsuleIcon() {
  return (
    <svg width="24" height="40" viewBox="0 0 24 40" fill="none">
      <path d="M12 1C6.477 1 2 5.477 2 11V20H22V11C22 5.477 17.523 1 12 1Z" fill="#0C447C" />
      <path d="M2 20V29C2 34.523 6.477 39 12 39C17.523 39 22 34.523 22 29V20H2Z" fill="#185FA5" />
      <line x1="2" y1="20" x2="22" y2="20" stroke="white" strokeWidth="1.4" />
    </svg>
  );
}

