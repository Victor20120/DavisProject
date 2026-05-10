import type { ConflictResult } from '../types';

interface ConflictAlertProps {
  conflicts: ConflictResult['conflicts'];
}

const SEVERITY: Record<string, { stripe: string; bg: string; title: string; desc: string; badge: string; badgeText: string }> = {
  mild: {
    stripe: '#F59E0B', bg: '#FFFBEB',
    title: '#92400E', desc: '#78350F',
    badge: '#FDE68A', badgeText: '#92400E',
  },
  moderate: {
    stripe: '#F97316', bg: '#FFF7ED',
    title: '#9A3412', desc: '#7C2D12',
    badge: '#FDBA74', badgeText: '#9A3412',
  },
  severe: {
    stripe: '#EF4444', bg: '#FEF2F2',
    title: '#991B1B', desc: '#7F1D1D',
    badge: '#FCA5A5', badgeText: '#991B1B',
  },
};

export default function ConflictAlert({ conflicts }: ConflictAlertProps) {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 mb-5">
      {conflicts.map((c, i) => {
        const s = SEVERITY[c.severity] ?? SEVERITY.moderate;
        return (
          <div
            key={i}
            className="flex rounded-[18px] overflow-hidden"
            style={{ backgroundColor: s.bg, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
          >
            {/* Bold left stripe */}
            <div className="w-1.5 shrink-0" style={{ backgroundColor: s.stripe }} />

            {/* Content */}
            <div className="flex-1 px-4 py-4">
              {/* Top row */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: s.stripe }}
                  >
                    <WarningIcon />
                  </div>
                  <span className="text-[15px] font-bold leading-tight" style={{ color: s.title }}>
                    {c.drug_a} + {c.drug_b}
                  </span>
                </div>
                <span
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shrink-0"
                  style={{ backgroundColor: s.badge, color: s.badgeText }}
                >
                  {c.severity}
                </span>
              </div>

              {/* Description */}
              <p className="text-[14px] leading-relaxed pl-[42px]" style={{ color: s.desc }}>
                {c.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L15 14H1L8 2Z" fill="white" />
      <line x1="8" y1="7" x2="8" y2="10.5" stroke={SEVERITY.moderate.stripe} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="12.2" r="0.7" fill={SEVERITY.moderate.stripe} />
    </svg>
  );
}
