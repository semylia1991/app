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
  onSelect: (result: AnalysisResult) => void;
}

export function ScanHistory({ user, lang, onSelect }: Props) {
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

  useEffect(() => {
    if (isOpen) fetchScans();
  }, [isOpen]);

  const deleteScan = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('scan_history').delete().eq('id', id);
    setScans(prev => prev.filter(s => s.id !== id));
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'ar' ? 'ar' : lang === 'uk' ? 'uk' : lang, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-[#B89F7A]/10 text-[#B89F7A] hover:bg-[#B89F7A]/20 hover:text-[#2C3E50] transition-all"
      >
        <Clock size={12} />
        <span>{t[lang].history}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm bg-[#FDFBF7] z-50 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-[#D4C3A3]">
                <h2 className="font-serif text-xl text-[#2C3E50]">{t[lang].history}</h2>
                <button onClick={() => setIsOpen(false)} className="text-[#B89F7A] hover:text-[#2C3E50]">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loading && (
                  <p className="text-center text-[#B89F7A] text-sm py-8">...</p>
                )}
                {!loading && scans.length === 0 && (
                  <p className="text-center text-[#B89F7A] text-sm py-8">{t[lang].noHistory}</p>
                )}
                {scans.map((scan) => (
                  <motion.div
                    key={scan.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 bg-white border border-[#D4C3A3]/50 rounded-sm cursor-pointer hover:border-[#B89F7A] transition-colors group"
                    onClick={() => {
                      onSelect(scan.result as AnalysisResult);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#2C3E50] text-sm truncate">{scan.product_name}</p>
                      <p className="text-xs text-[#B89F7A] italic truncate">{scan.brand}</p>
                      <p className="text-[10px] text-[#B89F7A]/70 mt-0.5">{formatDate(scan.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => deleteScan(scan.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-[#B89F7A] hover:text-red-400 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={14} className="text-[#B89F7A]" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
