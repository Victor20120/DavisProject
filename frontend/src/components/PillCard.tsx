import type { MedData } from '../types';

interface PillCardProps {
  data: MedData;
  onOkay?: () => void;
}

export default function PillCard({ data, onOkay }: PillCardProps) {
  const safe = data.conflicts.length === 0;

  return (
    <div className="w-full overflow-hidden" style={{ borderRadius: '20px' }}>

      {/* ── Navy header ── */}
      <div className="px-5 pt-6 pb-5" style={{ backgroundColor: '#0C447C' }}>
        <div className="flex items-start gap-4 mb-5">
          {/* Icon box */}
          <div
            className="w-12 h-12 rounded-[12px] flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#185FA5' }}
          >
            <PillIconWhite />
          </div>
          {/* Name */}
          <div>
            <h2 className="text-[22px] font-bold text-white leading-tight">
              {data.common_name}
            </h2>
            <p className="text-[14px] mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {data.generic_name} · {data.dosage} · {data.form}
            </p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {safe ? (
            <HeaderTag label="✓ Safe to take" color="#16A34A" bg="rgba(22,163,74,0.18)" />
          ) : (
            data.conflicts.map((c, i) => (
              <HeaderTag key={i} label={`⚠ ${c}`} color="#FCD34D" bg="rgba(180,130,0,0.25)" />
            ))
          )}
          <HeaderTag label={data.frequency} color="rgba(255,255,255,0.9)" bg="rgba(255,255,255,0.12)" />
          {data.take_with_food && (
            <HeaderTag label="Take with food" color="#FCD34D" bg="rgba(180,130,0,0.25)" />
          )}
        </div>
      </div>

      {/* ── White body ── */}
      <div className="bg-white" style={{ border: '0.5px solid #D6E4F7', borderTop: 'none' }}>

        {/* About section */}
        <div className="px-5 pt-5 pb-4">
          <p className="text-[12px] font-bold uppercase tracking-widest mb-4" style={{ color: '#378ADD' }}>
            About this medication
          </p>
          <div className="flex flex-col gap-3.5">
            <InfoRow label="Drug class"        value={data.drug_class} />
            <InfoRow label="Active ingredient" value={data.active_ingredient} />
            <InfoRow label="Common effects"    value={data.common_effects} />
            <InfoRow label="Manufacturer"      value={data.manufacturer} />
          </div>
        </div>

        <div className="mx-5 h-px" style={{ backgroundColor: '#D6E4F7' }} />

        {/* How to take it */}
        <div className="px-5 pt-4 pb-5">
          <p className="text-[12px] font-bold uppercase tracking-widest mb-3" style={{ color: '#378ADD' }}>
            How to take it
          </p>
          <div className="p-4 rounded-[12px]" style={{ backgroundColor: '#F5F8FF' }}>
            <p className="text-[16px] leading-relaxed" style={{ color: '#0C447C' }}>
              {data.how_to_take}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            type="button"
            onClick={onOkay}
            className="flex-1 font-semibold text-[16px] text-white"
            style={{ minHeight: '52px', borderRadius: '100px', backgroundColor: '#185FA5' }}
          >
            Add to Medications
          </button>
          <button
            type="button"
            className="flex-1 font-semibold text-[16px]"
            style={{ minHeight: '52px', borderRadius: '100px', border: '1.5px solid #185FA5', color: '#185FA5', backgroundColor: 'white' }}
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[14px] shrink-0" style={{ color: '#9CA3AF' }}>{label}</span>
      <span className="text-[15px] font-medium text-right" style={{ color: '#0C447C' }}>{value}</span>
    </div>
  );
}

function HeaderTag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span className="text-[12px] font-semibold px-3 py-1 rounded-full" style={{ color, backgroundColor: bg }}>
      {label}
    </span>
  );
}

function PillIconWhite() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <rect x="2" y="10" width="22" height="8" rx="4"
        transform="rotate(-45 2 10)"
        stroke="white" strokeWidth="1.8" />
      <line x1="7" y1="19" x2="19" y2="7" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
