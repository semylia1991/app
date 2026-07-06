import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, UserPlus, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase, ScanRecord } from '../lib/supabase';
import { t, Language } from '../i18n';
import { AnalysisResult, computeProductScore } from '../services/ai';

interface Criterion { emoji: string; label: string; explanation: string; ingredient?: string; relevant?: boolean; }

interface Props {
  lang: Language;
  current: AnalysisResult;
  currentCriteria: Criterion[];   // from PersonalAnalysis criteriaCache
  user: User | null;
  onRegister: () => void;
}

function truncate(text: string, max = 260): string {
  if (!text) return '';
  const s = text.replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

function extractCriteria(result: AnalysisResult): Criterion[] {
  // New format: stored directly in result.criteria
  if (Array.isArray((result as any).criteria) && (result as any).criteria.length) {
    return (result as any).criteria;
  }
  return [];
}

export function CompareSection({ lang, current, currentCriteria, user, onRegister }: Props) {
  const [scans, setScans]       = useState<ScanRecord[]>([]);
  const [loading, setLoading]   = useState(false);
  const [dbError, setDbError]   = useState<string | null>(null);
  const [picked, setPicked]     = useState<AnalysisResult | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const tt = t[lang] as any;

  const fetchScans = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true); setDbError(null);
    try {
      const { data, error } = await supabase
        .from('scan_history').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(20);
      if (error) { setDbError(`${error.message} (code: ${error.code})`); return; }
      setScans(data || []);
      setHasFetched(true);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { if (user && !hasFetched) fetchScans(); }, [user, hasFetched, fetchScans]);
  useEffect(() => { setPicked(null); setHasFetched(false); }, [user?.id]);

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '18px 12px' }}>
        <UserPlus size={22} style={{ color: '#B8923A', margin: '0 auto 10px' }} />
        <p style={{ fontSize: '0.8rem', color: '#5A5550', marginBottom: 14, lineHeight: 1.6 }}>
          {tt.compareRegisterPrompt}
        </p>
        <button onClick={onRegister} className="luxury-btn"
          style={{ padding: '10px 24px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <UserPlus size={13} /><span>{tt.askAiRegisterBtn}</span>
        </button>
      </div>
    );
  }

  const otherScans = scans.filter(s => {
    const r = s.result as AnalysisResult;
    return !(r?.productName === current.productName && r?.brand === current.brand);
  });

  const pickedCriteria = picked ? extractCriteria(picked) : [];

  const renderScore = (r: AnalysisResult) => {
    const s = r.canonicalScore ?? computeProductScore(r.ingredients);
    if (s === null) return <div style={{ ...sectionBodyStyle, color: '#8A8078', fontStyle: 'italic' }}>—</div>;
    const rounded = Math.round(s);
    const color = rounded >= 8 ? '#2D9B5A' : rounded >= 5 ? '#E8A020' : '#D94040';
    return (
      <div style={{ ...sectionBodyStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '1.2rem', fontWeight: 700, color, fontFamily: 'var(--font-sans)', lineHeight: 1 }}>{rounded}</span>
        <span style={{ fontSize: '0.7rem', color, opacity: 0.75 }}>/10</span>
        <div style={{ flex: 1, height: 5, background: 'rgba(0,0,0,0.07)', borderRadius: 8, overflow: 'hidden', minWidth: 30 }}>
          <div style={{ height: '100%', width: `${rounded * 10}%`, background: color, borderRadius: 8 }} />
        </div>
      </div>
    );
  };

  const SKIP_LABELS = /ничего|nothing|none|unknown|keine|нічого|ninguno|aucun|nessuno|bilinmiyor/i;

  const renderCriteria = (criteria: Criterion[]) => {
    const filtered = criteria.filter(c => c.relevant !== false && !SKIP_LABELS.test(c.label));
    if (!filtered.length) return (
      <span style={{ color: '#8A8078', fontStyle: 'italic', fontSize: '0.72rem' }}>
        {tt.compareNoPersonalNote}
      </span>
    );
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.map((c, i) => (
          <li key={i} style={{ fontSize: '0.74rem', lineHeight: 1.5, color: '#1A1410', display: 'flex', gap: 5 }}>
            <span style={{ flexShrink: 0 }}>{c.emoji}</span>
            <span>{c.label}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <AnimatePresence mode="wait">
        {!picked && (
          <motion.div key="picker"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
            <p style={{ fontSize: '0.82rem', color: '#5A5550', marginBottom: 14, lineHeight: 1.6 }}>
              {tt.comparePickProduct}
            </p>
            {dbError && (
              <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.3)', display: 'flex', gap: 8, marginBottom: 12 }}>
                <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                <p style={{ fontSize: '0.7rem', color: '#991B1B' }}>{dbError}</p>
              </div>
            )}
            {loading && <div style={{ textAlign: 'center', padding: '20px 0' }}><Loader2 size={18} className="animate-spin" style={{ color: '#2D5A3D' }} /></div>}
            {!loading && !dbError && otherScans.length === 0 && (
              <p style={{ textAlign: 'center', color: '#8A8078', fontSize: '0.82rem', padding: '20px 0' }}>{tt.compareNoHistoryYet}</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {otherScans.map(scan => (
                <button key={scan.id} onClick={() => setPicked(scan.result as AnalysisResult)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#FFFFFF', border: '0.5px solid #DDD5C8', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#2D5A3D')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#DDD5C8')}>
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

        {picked && (
          <motion.div key="table"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
            <button onClick={() => setPicked(null)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#2D5A3D', fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: 0, marginBottom: 12, fontFamily: 'var(--font-sans)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#1A1410')}
              onMouseLeave={e => (e.currentTarget.style.color = '#2D5A3D')}>
              <ArrowLeft size={12} /><span>{tt.back ?? tt.compareClose}</span>
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 10, rowGap: 6 }}>
              {/* Headers */}
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

              {/* Score */}
              <div style={sharedLabelStyle}>🧪 {tt.formulaScore ?? 'Formula score'}</div>
              {renderScore(current)}
              {renderScore(picked)}

              {/* Analysis */}
              <div style={sharedLabelStyle}>📋 {tt.compareColumnAnalysis}</div>
              <div style={sectionBodyStyle}>{truncate(current.analysis)}</div>
              <div style={sectionBodyStyle}>{truncate(picked.analysis)}</div>

              {/* Preferences */}
              <div style={sharedLabelStyle}>✅ {tt.compareColumnPreferences}</div>
              <div style={sectionBodyStyle}>{renderCriteria(currentCriteria)}</div>
              <div style={sectionBodyStyle}>{renderCriteria(pickedCriteria)}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const sharedLabelStyle: React.CSSProperties = {
  gridColumn: '1 / -1', fontSize: '0.75rem', letterSpacing: '0.04em',
  color: '#1A1410', fontWeight: 600, fontFamily: 'var(--font-sans)',
  textAlign: 'center', marginTop: 10, marginBottom: 2,
  paddingTop: 8, borderTop: '0.5px solid rgba(221,213,200,0.7)',
};

const sectionBodyStyle: React.CSSProperties = {
  fontSize: '0.76rem', lineHeight: 1.55, color: '#1A1410',
  wordBreak: 'break-word', overflowWrap: 'anywhere', padding: '4px 8px',
};
