import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, UserPlus, AlertCircle, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { User } from '@supabase/supabase-js';
import { supabase, ScanRecord } from '../lib/supabase';
import { t, Language } from '../i18n';
import { AnalysisResult } from '../services/ai';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  current: AnalysisResult;
  user: User | null;
  onRegister: () => void;
}

// Extract sections from a personalNote:
// - Brief summary   : the first 1-2 sentences before the "By preferences" heading
// - Preference bullets: every bullet that contains a 🟢 / 🟡 / 🔴 marker
function parsePersonalNote(note?: string): { summary: string; bullets: string[] } {
  if (!note || !note.trim()) return { summary: '', bullets: [] };
  const lines = note.split('\n').map(l => l.trim());

  // Pick bullet lines — any line starting with "- " or "• " that contains a color marker
  const bullets: string[] = [];
  const summaryParts: string[] = [];
  let seenBullet = false;

  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith('---')) continue;
    const isBullet = /^[-•]\s/.test(line);
    const hasMarker = /[🟢🟡🔴]/.test(line);

    if (isBullet && hasMarker) {
      seenBullet = true;
      bullets.push(line.replace(/^[-•]\s+/, ''));
      continue;
    }

    // Skip the "By preferences:" heading and the disclaimer
    if (/by preferences|по предпочтениям|за уподобан|nach vorlieben|por preferencias|par préférences|per preferenze|tercihlere göre/i.test(line)) continue;
    if (/automated analysis|автоматич|automatis|automatiz|automatis|automatik/i.test(line)) continue;
    if (line.startsWith('⚠')) continue;

    // Before the first bullet, lines form the Brief summary
    if (!seenBullet) {
      // Drop the Brief summary heading itself if present
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
  };
}

function truncate(text: string, max = 260): string {
  if (!text) return '';
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

export function CompareModal({ isOpen, onClose, lang, current, user, onRegister }: Props) {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [picked, setPicked] = useState<AnalysisResult | null>(null);

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
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) fetchScans();
    if (!isOpen) setPicked(null);
  }, [isOpen, user, fetchScans]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const tt = t[lang] as any;

  // Filter out the current product itself from the history list
  const otherScans = scans.filter(s => {
    const r = s.result as AnalysisResult;
    return !(r?.productName === current.productName && r?.brand === current.brand);
  });

  const currentParsed = parsePersonalNote(current.personalNote);
  const pickedParsed = picked ? parsePersonalNote(picked.personalNote) : { summary: '', bullets: [] };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="compare-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <motion.div
            key="compare-panel"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            onClick={e => e.stopPropagation()}
            style={{ background: '#FAF7F2', width: '100%', maxWidth: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '0.5px solid #DDD5C8' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '0.5px solid #DDD5C8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {picked && (
                  <button
                    onClick={() => setPicked(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8078', padding: 0, display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#1A1410')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#8A8078')}
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 300, color: '#1A1410', margin: 0 }}>
                  {tt.compareTitle}
                </h2>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8078', padding: 0, display: 'flex', alignItems: 'center' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1A1410')}
                onMouseLeave={e => (e.currentTarget.style.color = '#8A8078')}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {/* Not logged in → registration prompt */}
              {!user && (
                <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                  <UserPlus size={26} style={{ color: '#B8923A', margin: '0 auto 14px' }} />
                  <p style={{ fontSize: '0.88rem', color: '#5A5550', marginBottom: 18, lineHeight: 1.6 }}>
                    {tt.compareRegisterPrompt}
                  </p>
                  <button
                    onClick={() => { onClose(); onRegister(); }}
                    className="luxury-btn"
                    style={{ padding: '10px 24px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    <UserPlus size={13} />
                    <span>{tt.askAiRegisterBtn}</span>
                  </button>
                </div>
              )}

              {/* Logged in: picker (step 1) */}
              {user && !picked && (
                <>
                  <p style={{ fontSize: '0.82rem', color: '#5A5550', marginBottom: 14, lineHeight: 1.6 }}>
                    {tt.comparePickProduct}
                  </p>

                  {dbError && (
                    <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.3)', display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
                      <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: '0.7rem', color: '#991B1B', lineHeight: 1.5 }}>{dbError}</p>
                    </div>
                  )}

                  {loading && <p style={{ textAlign: 'center', color: '#2D5A3D', fontSize: '0.85rem', padding: '24px 0' }}>...</p>}

                  {!loading && !dbError && otherScans.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#8A8078', fontSize: '0.85rem', padding: '24px 0' }}>
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
                </>
              )}

              {/* Logged in: comparison table (step 2) */}
              {user && picked && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: 560 }}>
                    <thead>
                      <tr>
                        <th style={thStyle}></th>
                        <th style={{ ...thStyle, background: '#E8F2EB' }}>
                          <div style={{ fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2D5A3D', marginBottom: 4 }}>{tt.compareCurrent}</div>
                          <div style={{ fontWeight: 500, color: '#1A1410' }}>{current.productName}</div>
                          <div style={{ fontStyle: 'italic', color: '#2D5A3D', fontSize: '0.72rem' }}>{current.brand}</div>
                        </th>
                        <th style={thStyle}>
                          <div style={{ fontWeight: 500, color: '#1A1410' }}>{picked.productName}</div>
                          <div style={{ fontStyle: 'italic', color: '#2D5A3D', fontSize: '0.72rem' }}>{picked.brand}</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Analysis */}
                      <tr>
                        <td style={rowLabelStyle}>{tt.compareColumnAnalysis}</td>
                        <td style={cellStyle}>{truncate(current.analysis)}</td>
                        <td style={cellStyle}>{truncate(picked.analysis)}</td>
                      </tr>

                      {/* Preference bullets */}
                      <tr>
                        <td style={rowLabelStyle}>{tt.compareColumnPreferences}</td>
                        <td style={cellStyle}>
                          {currentParsed.bullets.length ? (
                            <ul style={bulletListStyle}>
                              {currentParsed.bullets.map((b, i) => (
                                <li key={i} style={bulletItemStyle}><ReactMarkdown>{b}</ReactMarkdown></li>
                              ))}
                            </ul>
                          ) : (
                            <span style={{ color: '#8A8078', fontStyle: 'italic', fontSize: '0.72rem' }}>{tt.compareNoPersonalNote}</span>
                          )}
                        </td>
                        <td style={cellStyle}>
                          {pickedParsed.bullets.length ? (
                            <ul style={bulletListStyle}>
                              {pickedParsed.bullets.map((b, i) => (
                                <li key={i} style={bulletItemStyle}><ReactMarkdown>{b}</ReactMarkdown></li>
                              ))}
                            </ul>
                          ) : (
                            <span style={{ color: '#8A8078', fontStyle: 'italic', fontSize: '0.72rem' }}>{tt.compareNoPersonalNote}</span>
                          )}
                        </td>
                      </tr>

                      {/* Brief summary */}
                      <tr>
                        <td style={rowLabelStyle}>{tt.compareColumnSummary}</td>
                        <td style={cellStyle}>
                          {currentParsed.summary ? (
                            <div style={{ fontSize: '0.78rem' }}><ReactMarkdown>{currentParsed.summary}</ReactMarkdown></div>
                          ) : (
                            <span style={{ color: '#8A8078', fontStyle: 'italic', fontSize: '0.72rem' }}>—</span>
                          )}
                        </td>
                        <td style={cellStyle}>
                          {pickedParsed.summary ? (
                            <div style={{ fontSize: '0.78rem' }}><ReactMarkdown>{pickedParsed.summary}</ReactMarkdown></div>
                          ) : (
                            <span style={{ color: '#8A8078', fontStyle: 'italic', fontSize: '0.72rem' }}>—</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  verticalAlign: 'top',
  borderBottom: '1px solid #DDD5C8',
  background: '#FFFFFF',
  fontFamily: 'var(--font-sans)',
  fontWeight: 400,
};

const rowLabelStyle: React.CSSProperties = {
  padding: '12px 12px',
  verticalAlign: 'top',
  borderBottom: '0.5px solid rgba(221,213,200,0.6)',
  color: '#2D5A3D',
  fontSize: '0.62rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontWeight: 500,
  whiteSpace: 'nowrap',
  background: '#F5F1E8',
};

const cellStyle: React.CSSProperties = {
  padding: '12px 12px',
  verticalAlign: 'top',
  borderBottom: '0.5px solid rgba(221,213,200,0.6)',
  color: '#1A1410',
  lineHeight: 1.55,
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
  fontSize: '0.76rem',
  lineHeight: 1.5,
  color: '#1A1410',
};
