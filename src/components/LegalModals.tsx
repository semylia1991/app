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
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl max-h-[92vh] bg-[#FDFBF7] regency-border z-50 shadow-2xl rounded-sm flex flex-col"
          >
            <div className="shrink-0 p-8 pb-4 border-b border-[#D4C3A3] relative">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 text-[#B89F7A] hover:text-[#2C3E50] transition-colors"
              >
                <X size={24} />
              </button>
              <h2 className="text-3xl font-serif text-center text-[#2C3E50]">
                {title}
              </h2>
            </div>
            <div
              ref={scrollRef}
              className="overflow-y-auto p-8 pt-6"
            >
              <div className="prose prose-stone max-w-none prose-headings:font-serif prose-headings:text-[#2C3E50] text-[#4A4A4A] text-sm leading-relaxed">
                {content}
              </div>
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
      <h3>Datenschutzerklärung</h3>
      <p className="text-xs text-gray-500 mb-4">Stand: März 2026</p>
 
      <h4>1. Verantwortliche Stelle</h4>
      <p>
        Verantwortlich im Sinne der Datenschutz-Grundverordnung (DSGVO) und anderer nationaler
        Datenschutzgesetze sowie sonstiger datenschutzrechtlicher Bestimmungen ist:
      </p>
      <p>
        <strong>Yuliia Parkina</strong><br/>
        GlowKey AI<br/>
        Wagenburgstrasse 79<br/>
        70184 Stuttgart<br/>
        Deutschland<br/>
        E-Mail: <a href="mailto:yuliia.parkina@gmail.com" className="text-[#B89F7A] hover:underline">yuliia.parkina@gmail.com</a>
      </p>
 
      <h4>2. Erhebung und Verarbeitung personenbezogener Daten</h4>
      <p>
        Wir erheben und verarbeiten personenbezogene Daten nur, soweit dies zur Bereitstellung
        einer funktionsfähigen Website sowie unserer Inhalte und Leistungen erforderlich ist.
        Eine Erhebung und Verarbeitung personenbezogener Daten unserer Nutzer erfolgt regelmäßig
        nur nach Einwilligung des Nutzers (Art. 6 Abs. 1 lit. a DSGVO).
      </p>
 
      <h4>3. Verarbeitung von Bilddaten durch KI</h4>
      <p>
        <strong>Welche Daten werden verarbeitet?</strong><br/>
        Wenn Sie ein Foto eines Kosmetikprodukts hochladen, wird dieses Bild zur Analyse an den
        KI-Dienst <strong>Google Gemini</strong> (Betreiber: Google LLC, 1600 Amphitheatre Parkway,
        Mountain View, CA 94043, USA) übermittelt.
      </p>
      <p>
        <strong>Zweck der Verarbeitung:</strong><br/>
        Die KI extrahiert Textinformationen (z. B. INCI-Listen) aus dem Bild und analysiert die
        enthaltenen Inhaltsstoffe. Das Ergebnis wird Ihnen unmittelbar im Browser angezeigt.
      </p>
      <p>
        <strong>Speicherdauer:</strong><br/>
        Hochgeladene Bilder werden ausschließlich für die Dauer der Analyse verarbeitet und
        anschließend nicht dauerhaft auf unseren Servern gespeichert. Google Gemini verarbeitet
        die Daten gemäß den Datenschutzbestimmungen von Google. Weitere Informationen finden Sie
        unter: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#B89F7A] hover:underline">https://policies.google.com/privacy</a>.
      </p>
      <p>
        <strong>Rechtsgrundlage:</strong><br/>
        Die Verarbeitung erfolgt auf Grundlage Ihrer ausdrücklichen Einwilligung gemäß
        Art. 6 Abs. 1 lit. a DSGVO, die Sie vor dem Hochladen eines Fotos erteilen.
        Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen.
      </p>
 
      <h4>4. Nutzung von Google Sign-In (optional)</h4>
      <p>
        Wenn Sie sich mit Ihrem Google-Konto anmelden, verarbeiten wir Ihren Namen und Ihre
        E-Mail-Adresse zur Verwaltung Ihres Nutzerkontos und zur Anzeige Ihrer Scan-Historie.
        Diese Daten werden in unserer Datenbank (Supabase) gespeichert. Rechtsgrundlage ist
        Art. 6 Abs. 1 lit. a DSGVO. Sie können Ihr Konto und alle zugehörigen Daten jederzeit
        löschen lassen, indem Sie uns per E-Mail kontaktieren.
      </p>
 
      <h4>5. Cookies und lokale Speicherung</h4>
      <p>
        Unsere Website verwendet Cookies sowie den lokalen Browserspeicher (localStorage), um
        Ihre Einwilligungspräferenzen und temporäre Analyseergebnisse zu speichern. Die
        Speicherung erfolgt ausschließlich auf Ihrem Gerät und wird nicht an Dritte übertragen.
      </p>
      <p>
        Sie können die Speicherung von Cookies in Ihren Browsereinstellungen deaktivieren.
        Bitte beachten Sie, dass die Deaktivierung von Cookies die Funktionalität unserer
        Website einschränken kann.
      </p>
 
      <h4>6. Datensicherheit</h4>
      <p>
        Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre Daten
        gegen zufällige oder vorsätzliche Manipulationen, Verlust, Zerstörung oder gegen den
        Zugriff unberechtigter Personen zu schützen. Diese Seite nutzt eine
        SSL-/TLS-Verschlüsselung für die sichere Übertragung von Daten.
      </p>
 
      <h4>7. Drittlandübermittlung</h4>
      <p>
        Die Verarbeitung Ihrer Bilddaten durch Google Gemini erfolgt möglicherweise auch in
        Drittländern außerhalb der EU/des EWR (insbesondere in den USA). Google LLC ist nach
        dem EU-US Data Privacy Framework zertifiziert, sodass ein angemessenes Datenschutzniveau
        gewährleistet ist (Art. 45 DSGVO).
      </p>
 
      <h4>8. Ihre Rechte als betroffene Person</h4>
      <p>Sie haben nach der DSGVO folgende Rechte gegenüber uns:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Auskunftsrecht</strong> (Art. 15 DSGVO): Recht auf Auskunft über die zu Ihrer Person gespeicherten Daten.</li>
        <li><strong>Berichtigungsrecht</strong> (Art. 16 DSGVO): Recht auf Berichtigung unrichtiger Daten.</li>
        <li><strong>Recht auf Löschung</strong> (Art. 17 DSGVO): Recht auf Löschung Ihrer gespeicherten Daten.</li>
        <li><strong>Recht auf Einschränkung</strong> (Art. 18 DSGVO): Recht auf Einschränkung der Verarbeitung.</li>
        <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO): Recht, Ihre Daten in einem maschinenlesbaren Format zu erhalten.</li>
        <li><strong>Widerspruchsrecht</strong> (Art. 21 DSGVO): Recht, der Verarbeitung Ihrer Daten zu widersprechen.</li>
        <li><strong>Widerruf der Einwilligung</strong> (Art. 7 Abs. 3 DSGVO): Sie können eine erteilte Einwilligung jederzeit widerrufen.</li>
      </ul>
      <p>
        Zur Geltendmachung Ihrer Rechte wenden Sie sich bitte per E-Mail an:
        <a href="mailto:yuliia.parkina@gmail.com" className="text-[#B89F7A] hover:underline ml-1">yuliia.parkina@gmail.com</a>
      </p>
 
      <h4>9. Beschwerderecht bei der Aufsichtsbehörde</h4>
      <p>
        Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung
        Ihrer personenbezogenen Daten durch uns zu beschweren. Die zuständige Aufsichtsbehörde
        für Baden-Württemberg ist:
      </p>
      <p>
        <strong>Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg</strong><br/>
        Lautenschlagerstraße 20<br/>
        70173 Stuttgart<br/>
        Telefon: +49 711 615541-0<br/>
        E-Mail: <a href="mailto:poststelle@lfdi.bwl.de" className="text-[#B89F7A] hover:underline">poststelle@lfdi.bwl.de</a><br/>
        Website: <a href="https://www.baden-wuerttemberg.datenschutz.de" target="_blank" rel="noopener noreferrer" className="text-[#B89F7A] hover:underline">www.baden-wuerttemberg.datenschutz.de</a>
      </p>
 
      <h4>10. Aktualität dieser Datenschutzerklärung</h4>
      <p>
        Diese Datenschutzerklärung ist aktuell gültig und hat den Stand März 2026.
        Durch die Weiterentwicklung unserer Website und Angebote darüber oder aufgrund geänderter
        gesetzlicher beziehungsweise behördlicher Vorgaben kann es notwendig werden, diese
        Datenschutzerklärung zu ändern.
      </p>
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
