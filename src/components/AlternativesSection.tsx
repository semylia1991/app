import { useState, useEffect } from 'react';
import { Alternative } from '../services/ai';
import { fetchProductImage } from '../lib/productImage';
 
// ── Single card ──────────────────────────────────────────────────────────────
function AlternativeCard({ alt }: { alt: Alternative }) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgState, setImgState] = useState<'loading' | 'loaded' | 'error'>('loading');
 
  useEffect(() => {
    let cancelled = false;
    fetchProductImage(alt.name, alt.brand).then((url) => {
      if (!cancelled) {
        setImgSrc(url);
        setImgState(url ? 'loaded' : 'error');
      }
    });
    return () => { cancelled = true; };
  }, [alt.name, alt.brand]);
 
  return (
    <div className="flex gap-3 py-3 border-b border-[#D4C3A3]/30 last:border-0">
      {/* Product image */}
      <div className="shrink-0 w-16 h-16 rounded-sm border border-[#D4C3A3]/50 bg-[#F5F0E8] overflow-hidden flex items-center justify-center">
        {imgState === 'loading' && (
          <div className="w-6 h-6 rounded-full border-2 border-[#B89F7A]/30 border-t-[#B89F7A] animate-spin" />
        )}
        {imgState === 'loaded' && imgSrc && (
          <img
            src={imgSrc}
            alt={alt.name}
            className="w-full h-full object-contain p-1"
            onError={() => setImgState('error')}
          />
        )}
        {imgState === 'error' && (
          // Placeholder: bottle silhouette via SVG
          <svg viewBox="0 0 40 56" className="w-8 h-10 text-[#D4C3A3]" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 0h10v5h3a2 2 0 0 1 2 2v4a8 8 0 0 1 4 7v28a8 8 0 0 1-8 8H14a8 8 0 0 1-8-8V18a8 8 0 0 1 4-7V7a2 2 0 0 1 2-2h3V0z" opacity=".4"/>
          </svg>
        )}
      </div>
 
      {/* Text */}
      <div className="flex flex-col justify-center min-w-0">
        <span className="font-semibold text-[#2C3E50] text-xs uppercase tracking-wide truncate">
          {alt.name}
        </span>
        <span className="text-[10px] text-[#B89F7A] italic mb-1 truncate">{alt.brand}</span>
        <span className="text-xs text-[#4A4A4A] leading-relaxed">{alt.reason}</span>
      </div>
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
      <p className="text-[9px] text-[#B89F7A]/60 pt-2 text-right italic">
        Images sourced from Open Beauty Facts
      </p>
    </div>
  );
}
