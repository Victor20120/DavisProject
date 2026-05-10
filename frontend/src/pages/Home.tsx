import { useState, useEffect, useRef } from 'react';

const BACKEND = 'http://localhost:8000';
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

  // Find the next upcoming reminder — prefers the Reminders tab cache, falls back to Firestore reminderTime
  const nextReminder = (() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let cacheMap: Record<string, { enabled: boolean; times: string[] }> = {};
    try {
      const raw = sessionStorage.getItem('pal_reminders_cache');
      if (raw) cacheMap = JSON.parse(raw);
    } catch {}

    const candidates = recentMeds.flatMap(m => {
      const cached = cacheMap[m.generic_name];
      const times = cached?.enabled ? cached.times
        : m.reminderTime ? [m.reminderTime]
        : [];
      return times.map(t => {
        const [h, min] = t.split(':').map(Number);
        return { med: m, time: t, minutes: h * 60 + min };
      });
    }).sort((a, b) => {
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
                <p className="text-[32px] font-bold mt-1 leading-none">{fmt12(nextReminder.time)}</p>
              </>
            ) : (
              <p className="text-[18px] font-semibold mt-1 opacity-80">No reminders set</p>
            )}
          </div>

          <VoiceChat userId={user?.uid ?? ''} />
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

// ─── Voice chat ───────────────────────────────────────────────────────────────

type VoiceState = 'idle' | 'listening' | 'transcribing' | 'speaking';

function VoiceChat({ userId }: { userId: string }) {
  const [state, setState]           = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply]           = useState('');
  const [error, setError]           = useState('');
  const recorder                    = useRef<MediaRecorder | null>(null);
  const chunks                      = useRef<Blob[]>([]);

  async function startListening() {
    setError(''); setTranscript(''); setReply('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.start();
      recorder.current = mr;
      setState('listening');
    } catch {
      setError('Microphone access denied.');
    }
  }

  async function stopAndSend() {
    if (!recorder.current || state !== 'listening') return;
    setState('transcribing');

    await new Promise<void>(res => {
      recorder.current!.onstop = () => res();
      recorder.current!.stop();
      recorder.current!.stream.getTracks().forEach(t => t.stop());
    });

    try {
      // Step 1 — STT + Claude
      const blob = new Blob(chunks.current, { type: 'audio/webm' });
      const form = new FormData();
      form.append('audio',   blob, 'recording.webm');
      form.append('user_id', userId);

      const listenRes = await fetch(`${BACKEND}/voice/listen`, { method: 'POST', body: form });
      if (!listenRes.ok) throw new Error(await listenRes.text());

      const { transcript: heard, reply: replyText } = await listenRes.json() as { transcript: string; reply: string };
      setTranscript(heard);
      setReply(replyText);
      setState('speaking');

      // Step 2 — TTS
      const speakRes = await fetch(`${BACKEND}/voice/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText }),
      });
      if (!speakRes.ok) throw new Error('TTS failed');

      const url   = URL.createObjectURL(await speakRes.blob());
      const audio = new Audio(url);
      audio.onended = () => { setState('idle'); URL.revokeObjectURL(url); };
      audio.play();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setState('idle');
    }
  }

  const labels: Record<VoiceState, string> = {
    idle: 'Hold to talk', listening: 'Listening…', transcribing: 'Thinking…', speaking: 'Speaking…',
  };
  const colors: Record<VoiceState, string> = {
    idle: '#185FA5', listening: '#DC2626', transcribing: '#D97706', speaking: '#16A34A',
  };

  return (
    <div className="rounded-[20px] p-5 flex flex-col items-center gap-4"
      style={{ backgroundColor: '#fff', border: '0.5px solid #D6E4F7' }}>
      <p className="text-[13px] font-semibold" style={{ color: '#378ADD' }}>Ask Pal anything about your meds</p>

      <button
        type="button"
        onPointerDown={startListening}
        onPointerUp={stopAndSend}
        onPointerLeave={() => { if (state === 'listening') stopAndSend(); }}
        disabled={state === 'transcribing' || state === 'speaking'}
        className="w-20 h-20 rounded-full flex items-center justify-center disabled:opacity-60"
        style={{
          backgroundColor: colors[state],
          boxShadow: state === 'listening' ? `0 0 0 14px ${colors.listening}25` : '0 4px 20px rgba(12,68,124,0.20)',
          transition: 'background-color 0.2s, box-shadow 0.2s',
        }}
      >
        {state === 'transcribing' ? (
          <svg className="animate-spin" width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="11" stroke="white" strokeWidth="2.5" strokeOpacity="0.3" />
            <path d="M14 3C7.9 3 3 7.9 3 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="9" y="2" width="10" height="16" rx="5" stroke="white" strokeWidth="2" fill="none" />
            <path d="M4 14C4 20.075 8.477 25 14 25C19.523 25 24 20.075 24 14" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <line x1="14" y1="25" x2="14" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>

      <p className="text-[13px] font-medium" style={{ color: colors[state] }}>{labels[state]}</p>
      {transcript && <p className="text-[12px] w-full px-1" style={{ color: '#94A3B8' }}>You: {transcript}</p>}
      {reply      && <p className="text-[14px] leading-relaxed w-full px-1 font-medium" style={{ color: '#0C447C' }}>Pal: {reply}</p>}
      {error      && <p className="text-[12px] text-center" style={{ color: '#DC2626' }}>{error}</p>}
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

