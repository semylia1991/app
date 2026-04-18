import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Trash2, ChevronRight, X, AlertCircle } from 'lucide-react';
import { supabase, ScanRecord } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { t, Language } from '../i18n';
import { AnalysisResult } from '../services/ai';

interface Props {
  user: User;
  lang: Language;
  refreshKey?: number;
  onSelect: (result: AnalysisResult, scanLang?: string) => void;
}

export function ScanHistory({ user, lang, refreshKey, onSelect }: Props) {
  const [scans, setScans]     = useState<ScanRecord[]>([]);
  const [isOpen, setIsOpen]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const fetchScans = useCallback(async () => {
    const u = userRef.current;
    if (!u?.id) {
      console.warn('[ScanHistory] fetchScans called without user');
      return;
    }
    setLoading(true);
    setDbError(null);
    try {
      const { data, error } = await supabase
        .from('scan_history')
        .select('*')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[ScanHistory] SELECT error:', error);
        setDbError(`SELECT: ${error.message} (code: ${error.code})`);
        return;
      }
      console.log('[ScanHistory] fetched', data?.length ?? 0, 'records');
      setScans(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    console.log('[ScanHistory] refreshKey changed to', refreshKey, '— fetching');
    fetchScans();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    if (isOpen) fetchScans();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const deleteScan = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from('scan_history').delete().eq('id', id);
    if (error) { console.error('[ScanHistory] DELETE error:', error); return; }
    setScans(prev => prev.filter(s => s.id !== id));
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(lang, {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
    } catch { return dateStr; }
  };

  const triggerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '5px 8px',
    border: '1px solid #DDD5C8', background: 'transparent', color: '#2D5A3D',
    fontSize: '0.55rem', fontWeight: 500, fontFamily: 'var(--font-sans)',
    letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
    transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={triggerStyle}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#2D5A3D'; e.currentTarget.style.background = '#E8F2EB'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDD5C8'; e.currentTarget.style.background = 'transparent'; }}
      >
        <Clock size={12} />
        <span>{t[lang].history}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 100 }}
          />
        )}
        {isOpen && (
          <motion.div key="panel"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: '100%', maxWidth: 380, background: '#FAF7F2', zIndex: 101, boxShadow: '0 0 40px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 24, borderBottom: '0.5px solid #DDD5C8' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 300, color: '#1A1410' }}>{t[lang].history}</h2>
              <button onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8078' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1A1410')}
                onMouseLeave={e => (e.currentTarget.style.color = '#8A8078')}>
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* Debug error — visible in UI */}
              {dbError && (
                <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.3)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: '0.7rem', color: '#991B1B', lineHeight: 1.5 }}>{dbError}</p>
                </div>
              )}

              {loading && (
                <p style={{ textAlign: 'center', color: '#2D5A3D', fontSize: '0.875rem', padding: '32px 0' }}>...</p>
              )}
              {!loading && !dbError && scans.length === 0 && (
                <p style={{ textAlign: 'center', color: '#8A8078', fontSize: '0.875rem', padding: '32px 0' }}>
                  {t[lang].noHistory}
                </p>
              )}
              {!loading && scans.map(scan => (
                <motion.div key={scan.id}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => { onSelect(scan.result as AnalysisResult, scan.scan_lang ?? undefined); setIsOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#FFFFFF', border: '0.5px solid #DDD5C8', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#2D5A3D')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#DDD5C8')}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, color: '#1A1410', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {scan.product_name}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#2D5A3D', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {scan.brand}
                    </p>
                    <p style={{ fontSize: '0.65rem', color: 'rgba(45,90,61,0.6)', marginTop: 2 }}>
                      {formatDate(scan.created_at)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button onClick={e => deleteScan(scan.id, e)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DDD5C8', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#DDD5C8')}>
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={14} style={{ color: '#2D5A3D' }} />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
