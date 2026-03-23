import { Alternative } from '../services/ai';
 
// ── Single card ──────────────────────────────────────────────────────────────
function AlternativeCard({ alt }: { alt: Alternative }) {
  return (
    <div className="py-3 border-b border-[#D4C3A3]/30 last:border-0">
      <span className="font-semibold text-[#2C3E50] text-xs uppercase tracking-wide">
        {alt.name}
      </span>
      <span className="text-[10px] text-[#B89F7A] italic block mb-1">{alt.brand}</span>
      <span className="text-xs text-[#4A4A4A] leading-relaxed">{alt.reason}</span>
    </div>
  );
}
 
// ── Section ──────────────────────────────────────────────────────────────────
interface Props {
  alternatives: Alternative[];
}
 
export function AlternativesSection({ alternatives }: Props) {
  if (!alternatives?.length) return null;
 
  return (
    <div className="space-y-0">
      {alternatives.map((alt, i) => (
        <AlternativeCard key={i} alt={alt} />
      ))}
    </div>
  );
}
