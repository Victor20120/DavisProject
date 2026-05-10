import { useRef, useState, useEffect, useCallback } from 'react';

interface ScanButtonProps {
  onImageCapture:  (base64: string, mediaType: string) => void;
  isScanning?:     boolean;
  isSuccess?:      boolean;
  onCameraToggle?: (isOpen: boolean) => void; // notifies parent when viewfinder opens/closes
}

const SCAN_INTERVAL_MS = 2000;

export default function ScanButton({ onImageCapture, isScanning = false, isSuccess = false, onCameraToggle }: ScanButtonProps) {
  const [open, setOpen] = useState(false);
  const videoRef   = useRef<HTMLVideoElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const lockedRef  = useRef(false);
  const isScanRef  = useRef(isScanning);

  useEffect(() => {
    isScanRef.current = isScanning;
    if (!isScanning) lockedRef.current = false;
  }, [isScanning]);

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setOpen(true);
      onCameraToggle?.(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      document.getElementById('pill-file-input')?.click();
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    lockedRef.current = false;
    onCameraToggle?.(false);
    setOpen(false);
  }

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const triggerScan = useCallback(() => {
    if (lockedRef.current || isScanRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];

    lockedRef.current = true;
    onImageCapture(base64, 'image/jpeg');
  }, [onImageCapture]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(triggerScan, SCAN_INTERVAL_MS);
    return () => clearInterval(id);
  }, [open, triggerScan]);

  // ── Derived visuals ───────────────────────────────────────────────────────────

  const borderColor = isSuccess  ? '#4ADE80' : '#FBBF24';
  const glowColor   = isSuccess  ? 'rgba(74,222,128,0.25)' : 'rgba(251,191,36,0.18)';
  const labelColor  = isSuccess  ? '#4ADE80' : '#FBBF24';

  const statusText  = isSuccess ? 'Got it!' : 'Scanning…';

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <input
        id="pill-file-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const base64 = await fileToBase64(file);
          onImageCapture(base64, file.type || 'image/jpeg');
          e.target.value = '';
        }}
      />

      {/* ── Scan card button (closed) ── */}
      {!open && (
        <button
          type="button"
          onClick={openCamera}
          className="w-full text-left"
          style={{ backgroundColor: '#185FA5', borderRadius: '20px' }}
        >
          <div className="flex items-center justify-between px-5 py-5 gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
                <CameraIcon />
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-[20px] leading-tight">Scan a pill bottle</p>
                <p className="text-[14px] mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Point your camera at any label
                </p>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              <div
                role="button"
                onClick={e => { e.stopPropagation(); document.getElementById('pill-file-input')?.click(); }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-white font-semibold text-[15px] cursor-pointer"
                style={{ backgroundColor: 'rgba(0,0,0,0.18)' }}
              >
                <UploadIcon /> Upload
              </div>
            </div>
          </div>
        </button>
      )}

      {/* ── Mobile two-button row (lg:hidden) ── */}
      {!open && (
        <div className="flex gap-3 lg:hidden">
          <button
            type="button"
            onClick={openCamera}
            className="flex-1 flex items-center justify-center gap-2 font-semibold text-[15px] text-white"
            style={{ minHeight: 48, borderRadius: 14, backgroundColor: '#185FA5' }}
          >
            <CameraIcon /> Camera
          </button>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); document.getElementById('pill-file-input')?.click(); }}
            className="flex-1 flex items-center justify-center gap-2 font-semibold text-[15px]"
            style={{ minHeight: 48, borderRadius: 14, border: '1.5px solid #185FA5', color: '#185FA5', backgroundColor: '#fff' }}
          >
            <UploadIcon color="#185FA5" /> Upload
          </button>
        </div>
      )}

      {/* ── Full-screen viewfinder ── */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay playsInline muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Dim overlay */}
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />

          <div className="relative z-10 flex flex-col items-center gap-5">
            {/* Scan box with pulsing amber glow */}
            <div className="relative">
              {/* Breathing glow behind the box */}
              <div
                className="absolute inset-0 rounded-2xl animate-pulse"
                style={{ backgroundColor: glowColor, transition: 'background-color 0.3s ease' }}
              />
              {/* The box itself */}
              <div
                className="relative rounded-2xl"
                style={{
                  width:  'min(92vw, 580px)',
                  height: 'min(64vw, 380px)',
                  border: `2.5px solid ${borderColor}`,
                  transition: 'border-color 0.3s ease',
                }}
              />
            </div>

            {/* Status pill */}
            <div
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-full"
              style={{
                backgroundColor: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${borderColor}`,
                transition: 'border-color 0.3s ease',
                minWidth: 180,
                justifyContent: 'center',
              }}
            >
              {!isSuccess && <ScanSpinner color={labelColor} />}
              {isSuccess  && <CheckDot />}
              <p className="text-[15px] font-bold" style={{ color: labelColor, transition: 'color 0.3s ease' }}>
                {statusText}
              </p>
            </div>
          </div>

          {/* Close */}
          <button
            onClick={closeCamera}
            className="absolute top-6 right-6 z-20 w-11 h-11 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: 'white', fontSize: '20px' }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function ScanSpinner({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 22 22" fill="none" className="animate-spin shrink-0">
      <circle cx="11" cy="11" r="9" stroke={color} strokeWidth="2" strokeOpacity="0.3" />
      <path d="M11 2C6.03 2 2 6.03 2 11" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckDot() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
      <circle cx="9" cy="9" r="8" fill="rgba(74,222,128,0.2)" stroke="#4ADE80" strokeWidth="1.5" />
      <path d="M5.5 9L7.5 11L12.5 6.5" stroke="#4ADE80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UploadIcon({ color = 'white' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17 8 12 3 7 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="3" x2="12" y2="15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M23 19C23 20.1 22.1 21 21 21H3C1.9 21 1 20.1 1 19V8C1 6.9 1.9 6 3 6H7L9 3H15L17 6H21C22.1 6 23 6.9 23 8V19Z"
        stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}
