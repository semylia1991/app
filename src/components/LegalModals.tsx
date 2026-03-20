import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
 
interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
}
 
export function LegalModal({ isOpen, onClose, title, content }: Props) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
 
  React.useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [isOpen]);
 
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <motion.div
            ref={scrollRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl max-h-[90vh] bg-[#FDFBF7] regency-border p-8 z-50 overflow-y-auto shadow-2xl rounded-sm"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-[#B89F7A] hover:text-[#2C3E50] transition-colors"
            >
              <X size={24} />
            </button>
 
            <h2 className="text-3xl font-serif text-center mb-8 text-[#2C3E50] border-b border-[#D4C3A3] pb-4">
              {title}
            </h2>
 
            <div className="prose prose-stone max-w-none prose-headings:font-serif prose-headings:text-[#2C3E50] text-[#4A4A4A] text-sm leading-relaxed">
              {content}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
 
export function PrivacyPolicyContent() {
  return (
    <div>
      <h3>Datenschutzerklärung (Privacy Policy)</h3>
      <p><strong>Verantwortliche Stelle:</strong><br/>
      Yuliia Parkina<br/>
      Wagenburgstrasse 79<br/>
      70184 Stuttgart<br/>
      E-Mail: yuliia.parkina@gmail.com</p>
      <h4>1. Datenverarbeitung durch KI</h4>
      <p>Wenn Sie ein Foto hochladen, wird dieses zur Analyse an einen KI-Dienst (Google Gemini) gesendet. Die KI extrahiert Text (INCI-Listen) und analysiert Inhaltsstoffe. Die hochgeladenen Bilder werden nach der Analyse (spätestens nach 24 Stunden) gelöscht, sofern Sie nicht ausdrücklich der Speicherung zustimmen.</p>
      <h4>2. Datenspeicherung</h4>
      <p>Wir speichern keine personenbezogenen Daten ohne Ihre ausdrückliche Zustimmung. Analyseergebnisse werden temporär in Ihrem Browser gespeichert.</p>
      <h4>3. Ihre Rechte (DSGVO)</h4>
      <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung Ihrer personenbezogenen Daten.</p>
      <h4>4. SSL-/TLS-Verschlüsselung</h4>
      <p>Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte eine SSL-bzw. TLS-Verschlüsselung.</p>
    </div>
  );
}
 
export function ImpressumContent() {
  return (
    <div>
      <h3>Impressum</h3>
      <p><strong>Angaben gemäß § 5 TMG:</strong></p>
      <p>
        Yuliia Parkina<br/>
        GlowKey AI<br/>
        Wagenburgstrasse 79<br/>
        70184 Stuttgart
      </p>
 
      <p><strong>Kontakt:</strong><br/>
      E-Mail: yuliia.parkina@gmail.com</p>
      <p><strong>EU-Streitschlichtung:</strong><br/>
      Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
      <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-[#B89F7A] hover:underline ml-1">
        https://ec.europa.eu/consumers/odr/
      </a>.<br/>
      Unsere E-Mail-Adresse finden Sie oben im Impressum.</p>
    </div>
  );
}
