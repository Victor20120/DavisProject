export default function ScanningOverlay() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5"
      style={{ backgroundColor: 'rgba(245, 248, 255, 0.92)', backdropFilter: 'blur(6px)' }}
    >
      <svg className="animate-spin" width="56" height="56" viewBox="0 0 56 56" fill="none">
        <circle cx="28" cy="28" r="23" stroke="#D6E4F7" strokeWidth="4" />
        <path d="M28 5C15.297 5 5 15.297 5 28" stroke="#185FA5" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <p className="text-[18px] font-semibold" style={{ color: '#0C447C' }}>
        Reviewing your scan…
      </p>
    </div>
  );
}
