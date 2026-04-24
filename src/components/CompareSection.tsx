import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, UserPlus, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase, ScanRecord } from '../lib/supabase';
import { t, Language } from '../i18n';
import { AnalysisResult } from '../services/ai';

interface Props {
  lang: Language;
  current: AnalysisResult;
  user: User | null;
  onRegister: () => void;
}

// Extract sections from a personalNote:
// - Brief summary   : the first 1-2 sentences before the "By preferences" heading
// - Preference bullets: every bullet that contains a 🟢 / 🟡 / 🔴 marker
// - rawNote         : the whole note (used as fallback when format is legacy/unknown)
function parsePersonalNote(note?: string): { summary: string; bullets: string[]; rawNote: string } {
  if (!note || !note.trim()) return { summary: '', bullets: [], rawNote: '' };
  const lines = note.split('\n').map(l => l.trim());

  const bullets: string[] = [];
  const summaryParts: string[] = [];
  let seenBullet = false;

  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith('---')) continue;
    const isBullet = /^[-•*]\s/.test(line);
    const hasMarker = /[🟢🟡🔴]/.test(line);

    if (isBullet && hasMarker) {
      seenBullet = true;
      bullets.push(line.replace(/^[-•*]\s+/, ''));
      continue;
    }

    if (/by preferences|по предпочтениям|за уподобан|nach vorlieben|por preferencias|par préférences|per preferenze|tercihlere göre/i.test(line)) continue;
    if (/automated analysis|автоматич|automatis|automatiz|automatik/i.test(line)) continue;
    if (line.startsWith('⚠')) continue;

    if (!seenBullet) {
      const stripped = line
        .replace(/^🧴\s*\*+\s*\[?[^\]*]*\]?\s*\*+\s*/u, '')
        .replace(/^\*+\s*\[?[^\]*]*\]?\s*\*+\s*/, '')
        .replace(/^🧴\s*/u, '')
        .trim();
      if (stripped) summaryParts.push(stripped);
    }
  }

  return {
    summary: summaryParts.join(' ').replace(/\s+/g, ' ').trim(),
    bullets,
    rawNote: note.trim(),
  };
}

function truncate(text: string, max = 260): string {
  if (!text) return '';
  const s = text.replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

// Parse a bullet line "Label 🟢 — explanation" into its label and color.
// Returns { label, color } where color is one of 'green' | 'yellow' | 'red' | null.
function parseBullet(bullet: string): { label: string; color: 'green' | 'yellow' | 'red' | null } {
  const text = bullet.trim();
  let color: 'green' | 'yellow' | 'red' | null = null;
  if (text.includes('🟢')) color = 'green';
  else if (text.includes('🟡')) color = 'yellow';
  else if (text.includes('🔴')) color = 'red';

  // Remove all color emojis and trailing "— explanation" from the label
  let label = text
    .replace(/[🟢🟡🔴]/g, '')
    .replace(/\s*[—–-]\s*.*$/s, '')
    .trim();

  return { label, color };
}

const DOT_COLORS: Record<'green' | 'yellow' | 'red', string> = {
  green: '#2D8A4E',
  yellow: '#E5B143',
  red: '#D14343',
};

export function CompareSection({ lang, current, user, onRegister }: Props) {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [picked, setPicked] = useState<AnalysisResult | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const tt = t[lang] as any;

  const fetchScans = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setDbError(null);
    try {
      const { data, error } = await supabase
        .from('scan_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) { setDbError(`${error.message} (code: ${error.code})`); return; }
      setScans(data || []);
      setHasFetched(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch history when the section mounts for a logged-in user
  useEffect(() => {
    if (user && !hasFetched) fetchScans();
  }, [user, hasFetched, fetchScans]);

  // If user changes (logout / login), reset picked product
  useEffect(() => {
    setPicked(null);
    setHasFetched(false);
  }, [user?.id]);

  // Not logged in → registration prompt
  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '18px 12px' }}>
        <UserPlus size={22} style={{ color: '#B8923A', margin: '0 auto 10px' }} />
        <p style={{ fontSize: '0.8rem', color: '#5A5550', marginBottom: 14, lineHeight: 1.6 }}>
          {tt.compareRegisterPrompt}
        </p>
        <button
          onClick={onRegister}
          className="luxury-btn"
          style={{ padding: '10px 24px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <UserPlus size={13} />
          <span>{tt.askAiRegisterBtn}</span>
        </button>
      </div>
    );
  }

  // Filter out the current product itself from the history list
  const otherScans = scans.filter(s => {
    const r = s.result as AnalysisResult;
    return !(r?.productName === current.productName && r?.brand === current.brand);
  });

  const currentParsed = parsePersonalNote(current.personalNote);
  const pickedParsed = picked ? parsePersonalNote(picked.personalNote) : { summary: '', bullets: [], rawNote: '' };

  return (
    <div>
      <AnimatePresence mode="wait">
        {/* Step 1 — product picker */}
        {!picked && (
          <motion.div
            key="picker"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <p style={{ fontSize: '0.82rem', color: '#5A5550', marginBottom: 14, lineHeight: 1.6 }}>
              {tt.comparePickProduct}
            </p>

            {dbError && (
              <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.3)', display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
                <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: '0.7rem', color: '#991B1B', lineHeight: 1.5 }}>{dbError}</p>
              </div>
            )}

            {loading && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Loader2 size={18} className="animate-spin" style={{ color: '#2D5A3D' }} />
              </div>
            )}

            {!loading && !dbError && otherScans.length === 0 && (
              <p style={{ textAlign: 'center', color: '#8A8078', fontSize: '0.82rem', padding: '20px 0' }}>
                {tt.compareNoHistoryYet}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {otherScans.map(scan => (
                <button
                  key={scan.id}
                  onClick={() => setPicked(scan.result as AnalysisResult)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#FFFFFF', border: '0.5px solid #DDD5C8', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.2s', fontFamily: 'inherit' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#2D5A3D')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#DDD5C8')}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, color: '#1A1410', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                      {(scan.result as AnalysisResult).productName}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#2D5A3D', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0 0' }}>
                      {(scan.result as AnalysisResult).brand}
                    </p>
                  </div>
                  <ChevronRight size={14} style={{ color: '#2D5A3D', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2 — comparison table */}
        {picked && (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <button
              onClick={() => setPicked(null)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#2D5A3D', fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: 0, marginBottom: 12, fontFamily: 'var(--font-sans)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#1A1410')}
              onMouseLeave={e => (e.currentTarget.style.color = '#2D5A3D')}
            >
              <ArrowLeft size={12} />
              <span>{tt.back ?? tt.compareClose}</span>
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 10, rowGap: 6 }}>
              {/* ─── Product headers (row 1) ─── */}
              <div style={{ background: '#E8F2EB', border: '0.5px solid #DDD5C8', padding: 10 }}>
                <div style={{ fontSize: '0.56rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2D5A3D', marginBottom: 4 }}>{tt.compareCurrent}</div>
                <div style={{ fontWeight: 500, color: '#1A1410', wordBreak: 'break-word', fontSize: '0.85rem' }}>{current.productName}</div>
                <div style={{ fontStyle: 'italic', color: '#2D5A3D', fontSize: '0.72rem' }}>{current.brand}</div>
              </div>
              <div style={{ background: '#FFFFFF', border: '0.5px solid #DDD5C8', padding: 10 }}>
                <div style={{ fontSize: '0.56rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8078', marginBottom: 4 }}>&nbsp;</div>
                <div style={{ fontWeight: 500, color: '#1A1410', wordBreak: 'break-word', fontSize: '0.85rem' }}>{picked.productName}</div>
                <div style={{ fontStyle: 'italic', color: '#2D5A3D', fontSize: '0.72rem' }}>{picked.brand}</div>
              </div>

              {/* ─── Analysis — shared label spans both columns ─── */}
              <div style={sharedLabelStyle}>📋 {tt.compareColumnAnalysis}</div>
              <div style={sectionBodyStyle}>{truncate(current.analysis)}</div>
              <div style={sectionBodyStyle}>{truncate(picked.analysis)}</div>

              {/* ─── Preferences — shared label spans both columns ─── */}
              <div style={sharedLabelStyle}>✅ {tt.compareColumnPreferences}</div>
              <div style={sectionBodyStyle}>
                {currentParsed.bullets.length ? (
                  <ul style={bulletListStyle}>
                    {currentParsed.bullets.map((b, i) => {
                      const { label, color } = parseBullet(b);
                      return (
                        <li key={i} style={bulletItemStyle}>
                          <span
                            aria-hidden
                            style={{
                              display: 'inline-block',
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: color ? DOT_COLORS[color] : 'transparent',
                              border: color ? 'none' : '1px solid #B8AA94',
                              flexShrink: 0,
                              marginRight: 6,
                              verticalAlign: 'middle',
                            }}
                          />
                          <span style={{ verticalAlign: 'middle' }}>{label}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <span style={{ color: '#8A8078', fontStyle: 'italic', fontSize: '0.72rem' }}>{tt.compareNoPersonalNote}</span>
                )}
              </div>
              <div style={sectionBodyStyle}>
                {pickedParsed.bullets.length ? (
                  <ul style={bulletListStyle}>
                    {pickedParsed.bullets.map((b, i) => {
                      const { label, color } = parseBullet(b);
                      return (
                        <li key={i} style={bulletItemStyle}>
                          <span
                            aria-hidden
                            style={{
                              display: 'inline-block',
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: color ? DOT_COLORS[color] : 'transparent',
                              border: color ? 'none' : '1px solid #B8AA94',
                              flexShrink: 0,
                              marginRight: 6,
                              verticalAlign: 'middle',
                            }}
                          />
                          <span style={{ verticalAlign: 'middle' }}>{label}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <span style={{ color: '#8A8078', fontStyle: 'italic', fontSize: '0.72rem' }}>{tt.compareNoPersonalNote}</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const sharedLabelStyle: React.CSSProperties = {
  gridColumn: '1 / -1',
  fontSize: '0.75rem',
  letterSpacing: '0.04em',
  color: '#1A1410',
  fontWeight: 600,
  fontFamily: 'var(--font-sans)',
  textAlign: 'center',
  marginTop: 10,
  marginBottom: 2,
  paddingTop: 8,
  borderTop: '0.5px solid rgba(221,213,200,0.7)',
};

const sectionBodyStyle: React.CSSProperties = {
  fontSize: '0.76rem',
  lineHeight: 1.55,
  color: '#1A1410',
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
  padding: '4px 8px',
};

const bulletListStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const bulletItemStyle: React.CSSProperties = {
  fontSize: '0.74rem',
  lineHeight: 1.5,
  color: '#1A1410',
};
