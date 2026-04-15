import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Trash2, ChevronRight, X } from 'lucide-react';
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
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchScans = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('scan_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setScans(data || []);
    setLoading(false);
  };

  // Refetch silently whenever a new scan is saved
  useEffect(() => {
    if (user) fetchScans();
  }, [refreshKey]);

  // Also refetch when panel opens
  useEffect(() => {
    if (isOpen && user) fetchScans();
  }, [isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const deleteScan = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('scan_history').delete().eq('id', id);
    setScans(prev => prev.filter(s => s.id !== id));
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'ar' ? 'ar' : lang === 'uk' ? 'uk' : lang, {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  /* ── shared inline styles ── */
  const panelBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '5px 8px',
    border: '1px solid #DDD5C8',
    background: 'transparent',
    color: '#2D5A3D',
    fontSize: '0.55rem', fontWeight: 500,
    fontFamily: 'var(--font-sans)', letterSpacing: '0.08em',
    textTransform: 'uppercase', cursor: 'pointer',
    transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
  };

  return (
    <>
      {/* Trigger — квадратная рамка */}
      <button
        onClick={() => setIsOpen(true)}
        style={panelBtn}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#2D5A3D'; e.currentTarget.style.background = '#E8F2EB'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDD5C8'; e.currentTarget.style.background = 'transparent'; }}
      >
        <Clock size={12} />
        <span>{t[lang].history}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="history-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 100 }}
          />
        )}
        {isOpen && (
          <motion.div
            key="history-panel"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: '100%', maxWidth: 380, background: '#FAF7F2', zIndex: 101, boxShadow: '0 0 40px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', borderBottom: '0.5px solid #DDD5C8' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 300, color: '#1A1410' }}>{t[lang].history}</h2>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8078', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1A1410')}
                onMouseLeave={e => (e.currentTarget.style.color = '#8A8078')}>
                <X size={20} />
              </button>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loading && <p style={{ textAlign: 'center', color: '#2D5A3D', fontSize: '0.875rem', padding: '32px 0' }}>...</p>}
              {!loading && scans.length === 0 && (
                <p style={{ textAlign: 'center', color: '#8A8078', fontSize: '0.875rem', padding: '32px 0' }}>{t[lang].noHistory}</p>
              )}
              {scans.map(scan => (
                <motion.div
                  key={scan.id}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => { onSelect(scan.result as AnalysisResult, scan.lang); setIsOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#FFFFFF', border: '0.5px solid #DDD5C8', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#2D5A3D')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#DDD5C8')}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, color: '#1A1410', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scan.product_name}</p>
                    <p style={{ fontSize: '0.75rem', color: '#2D5A3D', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scan.brand}</p>
                    <p style={{ fontSize: '0.65rem', color: 'rgba(45,90,61,0.6)', marginTop: 2 }}>{formatDate(scan.created_at)}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={(e) => deleteScan(scan.id, e)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DDD5C8', transition: 'color 0.2s', opacity: 0 }}
                      className="group-hover-show"
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#DDD5C8')}
                    >
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
