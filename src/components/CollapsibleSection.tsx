import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapseLabel?: string;
}

export function CollapsibleSection({ title, icon, children, defaultOpen = false, collapseLabel }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="section-row">
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '16px 24px',
          background: isOpen ? 'rgba(232,242,235,0.25)' : 'transparent',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          transition: 'background 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* green icon badge */}
          <span className="section-icon-wrap">
            {icon}
          </span>
          <h3 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.2rem', fontWeight: 300,
            color: '#1A1410', letterSpacing: '0.03em',
          }}>
            {title}
          </h3>
        </div>
        <span style={{ color: '#2D5A3D', display: 'flex', flexShrink: 0 }}>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '4px 20px 18px 20px', color: '#5A5550', fontSize: '1rem', lineHeight: 1.75 }}>
              {children}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 4, paddingBottom: 10,
                fontFamily: 'var(--font-sans)', fontSize: '0.55rem', fontWeight: 500,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'rgba(138,128,120,0.6)', background: 'none', border: 'none', cursor: 'pointer',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#2D5A3D')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(138,128,120,0.6)')}
            >
              <ChevronUp size={11} /><span>{collapseLabel ?? '↑'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
