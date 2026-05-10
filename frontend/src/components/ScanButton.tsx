// ScanButton — live camera viewfinder with auto-capture
//
// How it works:
//   1. User taps the button → camera opens as a full-screen overlay
//   2. Every 2 seconds a frame is grabbed automatically from the video stream
//   3. The frame is sent to the backend (via onImageCapture prop)
//   4. While Claude is analyzing, the scan frame turns yellow
//   5. When Claude returns a result, the parent navigates to /pill-card
//   6. If Claude fails to read the label, we silently try again next frame
//
// The parent (Home.tsx) doesn't need to change — it still receives
// (base64, mediaType) and handles the API call the same way.

import { useRef, useState, useEffect } from 'react';

interface ScanButtonProps {
  onImageCapture: (base64: string, mediaType: string) => void;
  isScanning?: boolean; // true while parent is waiting for Claude response
}

export default function ScanButton({ onImageCapture, isScanning = false }: ScanButtonProps) {
  const [open, setOpen] = useState(false);          // is the viewfinder showing?
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Refs let the interval callback always read the latest values
  // without needing to recreate the interval every render
  const isScanningRef  = useRef(isScanning);
  const isCapturingRef = useRef(false); // prevents sending two frames at once

  // Keep isScanningRef in sync with the prop
  useEffect(() => {
    isScanningRef.current = isScanning;
    // When a scan finishes (success or error), unlock the next capture
    if (!isScanning) isCapturingRef.current = false;
  }, [isScanning]);

  // ── Open camera ─────────────────────────────────────────────────────────────

  async function openCamera() {
    try {
      // Request back-facing camera on mobile, any camera on desktop
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setOpen(true);
      // Attach stream to the <video> element once it mounts
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      // Camera permission denied — fall back to file picker
      document.getElementById('pill-file-input')?.click();
    }
  }

  // ── Close camera ─────────────────────────────────────────────────────────────

  function closeCamera() {
    // Stop all tracks so the browser releases the camera (green dot goes away)
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    isCapturingRef.current = false;
    setOpen(false);
  }

  // Stop stream if the component unmounts while viewfinder is open
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  // ── Auto-capture interval ────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    const id = window.setInterval(() => {
      // Skip if Claude is already working on a frame, or video isn't ready
      if (isScanningRef.current || isCapturingRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      // Grab the current frame as a JPEG base64 string
      const canvas = document.createElement('canvas');
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')!.drawImage(video, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

      isCapturingRef.current = true; // lock until this scan finishes
      onImageCapture(base64, 'image/jpeg');
    }, 2000);

    return () => clearInterval(id);
  }, [open]); // only restart when viewfinder opens/closes

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Hidden file input — fallback if camera permission is denied */}
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
        }}
      />

      {/* ── Scan card button (closed state) ── */}
      {!open && (
        <button
          type="button"
          onClick={openCamera}
          className="w-full text-left"
          style={{ backgroundColor: '#185FA5', borderRadius: '20px' }}
        >
          <div className="flex items-center justify-between px-5 py-5 gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
              >
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
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-white font-semibold text-[15px]"
                style={{ backgroundColor: 'rgba(0,0,0,0.18)' }}
              >
                Open camera <span className="text-[18px]">→</span>
              </div>
              {/* Upload button — triggers the hidden file input */}
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

      {/* ── Full-screen viewfinder (open state) ── */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">

          {/* Live video — fills the screen */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Dark vignette so the scan frame stands out */}
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />

          {/* Scan frame — changes color while Claude is analyzing */}
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div
              className="w-72 h-48 rounded-2xl transition-colors duration-300"
              style={{
                border: `2.5px solid ${isScanning ? '#FBBF24' : 'white'}`,
                boxShadow: isScanning
                  ? '0 0 0 4px rgba(251,191,36,0.25)'
                  : '0 0 0 4px rgba(255,255,255,0.15)',
              }}
            />

            {/* Status text below the frame */}
            <div className="flex items-center gap-2">
              {isScanning && <Spinner />}
              <p className="text-white text-[15px] font-semibold drop-shadow">
                {isScanning ? 'Analyzing label...' : 'Point at the pill bottle label'}
              </p>
            </div>
          </div>

          {/* Close button — top right */}
          <button
            onClick={closeCamera}
            className="absolute top-6 right-6 z-20 w-11 h-11 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '20px' }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17 8 12 3 7 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="3" x2="12" y2="15" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M23 19C23 20.1 22.1 21 21 21H3C1.9 21 1 20.1 1 19V8C1 6.9 1.9 6 3 6H7L9 3H15L17 6H21C22.1 6 23 6.9 23 8V19Z"
        stroke="white" strokeWidth="1.5" strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 22 22" fill="none" className="animate-spin">
      <circle cx="11" cy="11" r="9" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
      <path d="M11 2C6.03 2 2 6.03 2 11" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
