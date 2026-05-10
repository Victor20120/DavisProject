import { useRef, useState } from 'react';

interface ScanButtonProps {
  onImageCapture: (base64: string, mediaType: string) => void;
  isScanning?: boolean;  // true while the API call is in flight
}

export default function ScanButton({ onImageCapture, isScanning = false }: ScanButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const busy = loading || isScanning;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      console.log('[Pill Pal] Image captured — base64 length:', base64.length);
      onImageCapture(base64, file.type || 'image/jpeg');
    } catch (err) {
      console.error('[Pill Pal] Failed to read image:', err);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Big blue scan card — matches mockup */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full text-left disabled:opacity-60"
        style={{ backgroundColor: '#185FA5', borderRadius: '20px' }}
      >
        <div className="flex items-center justify-between px-5 py-5 gap-4">
          {/* Left: circle + text */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
            >
              {busy ? <Spinner /> : <CameraIcon />}
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-[20px] leading-tight">
                {isScanning ? 'Analyzing label...' : loading ? 'Reading image...' : 'Scan a pill bottle'}
              </p>
              <p className="text-[14px] mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {isScanning ? 'Claude is reading your label' : loading ? 'Processing your image' : 'Point your camera at any label'}
              </p>
            </div>
          </div>

          {/* Right: "Open camera" — desktop only */}
          <div
            className="hidden lg:flex items-center gap-2 px-4 py-3 rounded-[12px] text-white font-semibold text-[15px] shrink-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.18)' }}
          >
            Open camera <span className="text-[18px]">→</span>
          </div>
        </div>
      </button>
    </>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip "data:image/jpeg;base64," prefix — keep only the raw base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function CameraIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M23 19C23 20.1 22.1 21 21 21H3C1.9 21 1 20.1 1 19V8C1 6.9 1.9 6 3 6H7L9 3H15L17 6H21C22.1 6 23 6.9 23 8V19Z"
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      className="animate-spin"
    >
      <circle cx="11" cy="11" r="9" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
      <path
        d="M11 2C6.03 2 2 6.03 2 11"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
