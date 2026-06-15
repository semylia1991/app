import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Language } from '../i18n';

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
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="w-full max-w-2xl bg-[#FDFBF7] regency-border shadow-2xl rounded-sm flex flex-col"
            style={{ maxHeight: '92vh' }}
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
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── German originals (verbatim, legally authoritative) ──────────────────────
function PrivacyDE() {
  return (
    <div>
          <h3>Datenschutzerklärung</h3>
          <p className="text-xs text-gray-500 mb-4">Stand: März 2026</p>

          <h4>1. Verantwortliche Stelle</h4>
          <p>
            Verantwortlich im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
          </p>
          <p>
            <strong>Yuliia Parkina</strong><br/>
            GlowKI<br/>
            Wagenburgstrasse 79<br/>
            70184 Stuttgart<br/>
            Deutschland<br/>
            E-Mail: <a href="mailto:yuliia.parkina@gmail.com" className="text-[#B89F7A] hover:underline">yuliia.parkina@gmail.com</a>
          </p>

          <h4>2. Erhebung und Verarbeitung personenbezogener Daten</h4>
          <p>
            Wir erheben und verarbeiten personenbezogene Daten nur, soweit dies zur Bereitstellung
            einer funktionsfähigen Website sowie unserer Inhalte und Leistungen erforderlich ist.
            Eine Erhebung und Verarbeitung erfolgt regelmäßig nur nach Einwilligung des Nutzers
            (Art. 6 Abs. 1 lit. a DSGVO).
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
            die Daten gemäß den Datenschutzbestimmungen von Google:{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#B89F7A] hover:underline">https://policies.google.com/privacy</a>.
          </p>
          <p>
            <strong>Rechtsgrundlage:</strong><br/>
            Die Verarbeitung erfolgt auf Grundlage Ihrer ausdrücklichen Einwilligung gemäß
            Art. 6 Abs. 1 lit. a DSGVO, die Sie vor dem Hochladen eines Fotos erteilen.
            Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen,
            indem Sie die Seite neu laden und das Foto nicht erneut hochladen.{' '}
            <strong>Die Übermittlung von Daten an Google LLC (USA) erfolgt auf Grundlage von
            Standardvertragsklauseln gemäß Art. 46 Abs. 2 lit. c DSGVO</strong> im Rahmen
            der Google Cloud Data Processing Addendum:{' '}
            <a href="https://cloud.google.com/terms/data-processing-addendum" target="_blank" rel="noopener noreferrer" className="text-[#B89F7A] hover:underline">cloud.google.com/terms/data-processing-addendum</a>.
          </p>

          <h4>4. Verarbeitung von Gesundheitsdaten im Nutzerprofil (Art. 9 DSGVO)</h4>
          <p>
            Im optionalen Nutzerprofil können Sie Angaben zu Ihrer Haut und Ihren Haaren machen,
            darunter Hauttyp, Hauterkrankungen (z. B. Akne, Rosazea, atopische Dermatitis),
            Empfindlichkeiten und Haarprobleme. <strong>Diese Angaben können Gesundheitsdaten
            im Sinne von Art. 4 Nr. 15 DSGVO darstellen</strong> und unterliegen als besondere
            Kategorie personenbezogener Daten dem erhöhten Schutz nach Art. 9 DSGVO.
          </p>
          <p>
            <strong>Zweck der Verarbeitung:</strong><br/>
            Die Profildaten werden ausschließlich dazu verwendet, die KI-Analyse von
            Kosmetikprodukten auf Ihre persönlichen Hautbedürfnisse abzustimmen.
          </p>
          <p>
            <strong>Rechtsgrundlage:</strong><br/>
            Die Verarbeitung erfolgt ausschließlich auf Grundlage Ihrer <strong>ausdrücklichen
            Einwilligung</strong> gemäß Art. 9 Abs. 2 lit. a DSGVO, die Sie beim Speichern des
            Profils durch Aktivierung der entsprechenden Checkbox erteilen.
          </p>
          <p>
            <strong>Widerruf:</strong><br/>
            Sie können diese Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen,
            indem Sie Ihr Profil löschen oder uns per E-Mail kontaktieren. Der Widerruf berührt
            nicht die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung.
          </p>
          <p>
            <strong>Speicherung:</strong><br/>
            Die Profildaten werden in unserer Datenbank (Supabase, siehe Abschnitt 6) gespeichert
            und nur solange aufbewahrt, wie Sie ein Konto bei uns führen.
          </p>

          <h4>5. Nutzung von Google Sign-In (optional)</h4>
          <p>
            Wenn Sie sich mit Ihrem Google-Konto anmelden, verarbeiten wir Ihren Namen und Ihre
            E-Mail-Adresse zur Verwaltung Ihres Nutzerkontos und zur Anzeige Ihrer Scan-Historie.
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO. Sie können Ihr Konto und alle
            zugehörigen Daten jederzeit löschen lassen, indem Sie uns per E-Mail kontaktieren.
          </p>

          <h4>6. Auftragsverarbeiter: Supabase</h4>
          <p>
            Für die Speicherung von Nutzerdaten (Konto, Scan-Verlauf, Nutzerprofil, geteilte
            Analyseergebnisse) setzen wir den Dienst <strong>Supabase</strong> (Supabase Inc.,
            970 Toa Payoh North, Singapur) ein. Supabase handelt als Auftragsverarbeiter
            gemäß Art. 28 DSGVO. Mit Supabase besteht ein Auftragsverarbeitungsvertrag (AVV).{' '}
            <strong>Die Datenübermittlung in Drittländer erfolgt auf Grundlage von
            Standardvertragsklauseln gemäß Art. 46 Abs. 2 lit. c DSGVO.</strong>{' '}
            Die Daten werden auf Servern innerhalb der EU (Frankfurt, AWS eu-central-1) gespeichert.
            Weitere Informationen:{' '}
            <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#B89F7A] hover:underline">https://supabase.com/privacy</a>.
          </p>

          <h4>7. Analyse-Dienst: PostHog</h4>
          <p>
            Mit Ihrer Einwilligung (Cookie-Consent) nutzen wir <strong>PostHog</strong> (PostHog Inc.,
            965 Mission St, San Francisco, CA 94103, USA; EU-Server: eu.i.posthog.com)
            zur anonymisierten Nutzungsanalyse. Dabei werden Ereignisse wie gestartete und
            abgeschlossene Analysen erfasst — ohne personenbezogene Inhalte. PostHog respektiert
            das Do-Not-Track-Signal des Browsers. Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO
            i. V. m. § 25 Abs. 1 TDDDG. Ohne Ihre Einwilligung wird PostHog nicht initialisiert.
          </p>

          <h4>8. Cookies und lokale Speicherung (§ 25 TDDDG)</h4>
          <p>
            Unsere Website verwendet Cookies sowie den lokalen Browserspeicher (localStorage) gemäß
            § 25 TDDDG (Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz). Technisch notwendige
            Speicherungen (z. B. Sitzungsdaten für die Authentifizierung) erfolgen ohne gesonderte
            Einwilligung auf Grundlage von § 25 Abs. 2 Nr. 2 TDDDG. Für analytische Cookies
            (PostHog) ist Ihre ausdrückliche Einwilligung erforderlich.
          </p>
          <p>
            Sie können die Speicherung von Cookies in Ihren Browsereinstellungen deaktivieren.
            Bitte beachten Sie, dass dies die Funktionalität unserer Website einschränken kann.
          </p>

          <h4>9. Datensicherheit</h4>
          <p>
            Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre Daten
            gegen Manipulationen, Verlust, Zerstörung oder unbefugten Zugriff zu schützen.
            Diese Seite nutzt SSL-/TLS-Verschlüsselung für die sichere Datenübertragung.
          </p>

          <h4>10. Drittlandübermittlung</h4>
          <p>
            Die Verarbeitung Ihrer Bilddaten durch Google Gemini erfolgt möglicherweise auch in
            Drittländern außerhalb der EU/des EWR (insbesondere in den USA). Google LLC ist nach
            dem EU-US Data Privacy Framework zertifiziert, sodass ein angemessenes Datenschutzniveau
            gewährleistet ist (Art. 45 DSGVO). PostHog verarbeitet Daten auf EU-Servern.
          </p>

          <h4>11. Ihre Rechte als betroffene Person</h4>
          <p>Sie haben nach der DSGVO folgende Rechte gegenüber uns:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Auskunftsrecht</strong> (Art. 15 DSGVO)</li>
            <li><strong>Berichtigungsrecht</strong> (Art. 16 DSGVO)</li>
            <li><strong>Recht auf Löschung</strong> (Art. 17 DSGVO) — inkl. Löschung Ihres Kontos und aller Profildaten</li>
            <li><strong>Recht auf Einschränkung</strong> (Art. 18 DSGVO)</li>
            <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO)</li>
            <li><strong>Widerspruchsrecht</strong> (Art. 21 DSGVO)</li>
            <li><strong>Widerruf der Einwilligung</strong> (Art. 7 Abs. 3 DSGVO) — jederzeit ohne Angabe von Gründen; gilt auch für die ausdrückliche Einwilligung nach Art. 9 Abs. 2 lit. a DSGVO für Gesundheitsdaten</li>
          </ul>
          <p>
            Zur Geltendmachung Ihrer Rechte wenden Sie sich bitte per E-Mail an:{' '}
            <a href="mailto:yuliia.parkina@gmail.com" className="text-[#B89F7A] hover:underline">yuliia.parkina@gmail.com</a>
          </p>

          <h4>12. Beschwerderecht bei der Aufsichtsbehörde</h4>
          <p>
            Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
            Die zuständige Aufsichtsbehörde für Baden-Württemberg ist:
          </p>
          <p>
            <strong>Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg</strong><br/>
            Lautenschlagerstraße 20<br/>
            70173 Stuttgart<br/>
            Telefon: +49 711 615541-0<br/>
            E-Mail: <a href="mailto:poststelle@lfdi.bwl.de" className="text-[#B89F7A] hover:underline">poststelle@lfdi.bwl.de</a><br/>
            Website: <a href="https://www.baden-wuerttemberg.datenschutz.de" target="_blank" rel="noopener noreferrer" className="text-[#B89F7A] hover:underline">www.baden-wuerttemberg.datenschutz.de</a>
          </p>

          <h4>13. Aktualität dieser Datenschutzerklärung</h4>
          <p>
            Diese Datenschutzerklärung ist aktuell gültig und hat den Stand März 2026.
            Durch die Weiterentwicklung unserer Website kann es notwendig werden, diese
            Datenschutzerklärung zu ändern.
          </p>
        </div>
  );
}

function AgbDE() {
  return (
    <div>
          <h3>Allgemeine Geschäftsbedingungen (AGB)</h3>
          <p className="text-xs text-gray-500 mb-4">Stand: März 2026</p>

          <h4>1. Anbieter und Geltungsbereich</h4>
          <p>
            Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung des Dienstes <strong>GlowKI</strong>,
            betrieben von:
          </p>
          <p>
            <strong>Yuliia Parkina</strong><br/>
            GlowKI<br/>
            Wagenburgstrasse 79<br/>
            70184 Stuttgart<br/>
            Deutschland<br/>
            E-Mail: <a href="mailto:yuliia.parkina@gmail.com" className="text-[#B89F7A] hover:underline">yuliia.parkina@gmail.com</a>
          </p>

          <h4>2. Leistungsbeschreibung</h4>
          <p>
            GlowKI ist eine webbasierte Anwendung zur KI-gestützten Analyse von Kosmetikinhaltsstoffen (INCI).
            Der Dienst wird in einer kostenlosen Basisversion sowie einer kostenpflichtigen Premium-Version angeboten.
          </p>
          <p>
            <strong>Kostenlose Version:</strong> bis zu 15 Scans pro Tag, bis zu 10 „Beachte"-Analysen pro Tag,
            bis zu 3 KI-Fragen pro Tag.
          </p>
          <p>
            <strong>Premium-Version:</strong> unbegrenzte Scans, unbegrenzte „Beachte"-Analysen,
            bis zu 10 KI-Fragen pro Tag, vollständige Scan-Historie.
          </p>
          <p>
            Die Analyseergebnisse dienen ausschließlich der allgemeinen Information und stellen
            <strong> keine medizinische, dermatologische oder ärztliche Beratung</strong> dar.
            Bei Hauterkrankungen oder gesundheitlichen Beschwerden wenden Sie sich bitte an einen Arzt oder Apotheker.
          </p>

          <h4>3. Vertragsschluss und Premium-Abonnement</h4>
          <p>
            Durch Klick auf „Auf Premium upgraden" und Abschluss des Zahlungsvorgangs über Stripe
            kommt ein Abonnementvertrag zwischen Ihnen und Yuliia Parkina (GlowKI) zustande.
            Der Vertrag wird in deutscher oder englischer Sprache geschlossen.
          </p>
          <p>
            Der Preis beträgt <strong>€ 4,99 pro Monat</strong> (inkl. gesetzlicher MwSt., soweit anwendbar).
            Die Abrechnung erfolgt monatlich im Voraus über den Zahlungsdienstleister Stripe.
            Akzeptierte Zahlungsmethoden: Kreditkarte.
          </p>

          <h4>4. Widerrufsrecht</h4>
          <p>
            <strong>Widerrufsbelehrung gemäß § 355 BGB</strong>
          </p>
          <p>
            Sie haben das Recht, binnen <strong>14 Tagen ohne Angabe von Gründen</strong> diesen Vertrag
            zu widerrufen. Die Widerrufsfrist beträgt 14 Tage ab dem Tag des Vertragsschlusses.
          </p>
          <p>
            Um Ihr Widerrufsrecht auszuüben, müssen Sie uns:
          </p>
          <p>
            <strong>Yuliia Parkina, GlowKI</strong><br/>
            Wagenburgstrasse 79, 70184 Stuttgart<br/>
            E-Mail: <a href="mailto:yuliia.parkina@gmail.com" className="text-[#B89F7A] hover:underline">yuliia.parkina@gmail.com</a>
          </p>
          <p>
            mittels einer eindeutigen Erklärung (z. B. eine E-Mail) über Ihren Entschluss,
            diesen Vertrag zu widerrufen, informieren.
          </p>
          <p>
            <strong>Folgen des Widerrufs:</strong> Wenn Sie diesen Vertrag widerrufen, erstatten wir Ihnen
            alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen 14 Tagen
            ab dem Tag, an dem die Mitteilung über Ihren Widerruf bei uns eingegangen ist.
            Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen
            Transaktion eingesetzt haben.
          </p>
          <p className="text-xs bg-amber-50 border border-amber-200 rounded p-3 mt-2">
            <strong>Hinweis zum vorzeitigen Beginn:</strong> Wenn Sie ausdrücklich verlangen, dass die Leistung
            vor Ablauf der Widerrufsfrist beginnen soll, und Sie Ihr Widerrufsrecht dennoch ausüben,
            haben Sie uns einen angemessenen Betrag für die bis zum Widerruf erbrachten Leistungen zu zahlen.
          </p>

          <h4>5. Kündigung des Abonnements</h4>
          <p>
            Das Premium-Abonnement verlängert sich automatisch um jeweils einen Monat, sofern es nicht
            gekündigt wird. Sie können das Abonnement jederzeit zum Ende der laufenden Abrechnungsperiode
            kündigen, indem Sie uns per E-Mail an{' '}
            <a href="mailto:yuliia.parkina@gmail.com" className="text-[#B89F7A] hover:underline">yuliia.parkina@gmail.com</a>{' '}
            kontaktieren. Nach der Kündigung bleibt der Zugang bis zum Ende der bezahlten Periode erhalten.
          </p>

          <h4>6. Verfügbarkeit und Haftung</h4>
          <p>
            Wir bemühen uns um eine hohe Verfügbarkeit des Dienstes, übernehmen jedoch keine Garantie
            für eine ununterbrochene Erreichbarkeit. Wartungsarbeiten und technische Störungen sind möglich.
          </p>
          <p>
            Die Haftung von GlowKI ist auf Vorsatz und grobe Fahrlässigkeit beschränkt, soweit keine
            Verletzung wesentlicher Vertragspflichten vorliegt. Für die Richtigkeit, Vollständigkeit
            und Aktualität der KI-generierten Analyseergebnisse wird keine Gewähr übernommen.
          </p>

          <h4>7. Nutzungsrechte und verbotene Nutzung</h4>
          <p>
            Sie erhalten ein einfaches, nicht übertragbares Recht zur Nutzung des Dienstes für
            persönliche, nicht-kommerzielle Zwecke. Untersagt ist insbesondere:
            automatisiertes Abrufen von Daten (Scraping), Weiterverkauf der Analyseergebnisse,
            sowie jede Nutzung, die gegen geltendes Recht verstößt.
          </p>

          <h4>8. Änderungen der AGB</h4>
          <p>
            Wir behalten uns vor, diese AGB mit einer Frist von mindestens 30 Tagen zu ändern.
            Sie werden per E-Mail über wesentliche Änderungen informiert. Widersprechen Sie
            nicht innerhalb von 30 Tagen, gelten die neuen AGB als akzeptiert.
          </p>

          <h4>9. Anwendbares Recht und Gerichtsstand</h4>
          <p>
            Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand für Kaufleute
            und juristische Personen ist Stuttgart.
          </p>
        </div>
  );
}

// ── English translations ────────────────────────────────────────────────────
// NOTE: provided for convenience. The German versions remain authoritative;
// have the English versions reviewed by a qualified party before relying on
// them legally.
function PrivacyEN() {
  return (
    <div>
          <h3>Privacy Policy</h3>
          <p className="text-xs text-gray-500 mb-4">As of: March 2026</p>

          <h4>1. Controller</h4>
          <p>
            The controller within the meaning of the General Data Protection Regulation (GDPR) is:
          </p>
          <p>
            <strong>Yuliia Parkina</strong><br/>
            GlowKI<br/>
            Wagenburgstrasse 79<br/>
            70184 Stuttgart<br/>
            Germany<br/>
            Email: <a href="mailto:yuliia.parkina@gmail.com" className="text-[#B89F7A] hover:underline">yuliia.parkina@gmail.com</a>
          </p>

          <h4>2. Collection and Processing of Personal Data</h4>
          <p>
            We collect and process personal data only insofar as this is necessary to provide a
            functional website and our content and services. As a rule, collection and processing
            take place only with the user&apos;s consent (Art. 6(1)(a) GDPR).
          </p>

          <h4>3. Processing of Image Data by AI</h4>
          <p>
            <strong>Which data is processed?</strong><br/>
            When you upload a photo of a cosmetic product, this image is transmitted for analysis to
            the AI service <strong>Google Gemini</strong> (operator: Google LLC, 1600 Amphitheatre
            Parkway, Mountain View, CA 94043, USA).
          </p>
          <p>
            <strong>Purpose of processing:</strong><br/>
            The AI extracts text information (e.g. INCI lists) from the image and analyses the
            ingredients it contains. The result is displayed to you immediately in your browser.
          </p>
          <p>
            <strong>Storage period:</strong><br/>
            Uploaded images are processed solely for the duration of the analysis and are not
            permanently stored on our servers afterwards. Google Gemini processes the data in
            accordance with Google&apos;s privacy policy:{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#B89F7A] hover:underline">https://policies.google.com/privacy</a>.
          </p>
          <p>
            <strong>Legal basis:</strong><br/>
            Processing is carried out on the basis of your express consent pursuant to
            Art. 6(1)(a) GDPR, which you give before uploading a photo. You may withdraw your consent
            at any time with effect for the future by reloading the page and not uploading the photo
            again.{' '}
            <strong>The transfer of data to Google LLC (USA) is based on Standard Contractual Clauses
            pursuant to Art. 46(2)(c) GDPR</strong> under the Google Cloud Data Processing Addendum:{' '}
            <a href="https://cloud.google.com/terms/data-processing-addendum" target="_blank" rel="noopener noreferrer" className="text-[#B89F7A] hover:underline">cloud.google.com/terms/data-processing-addendum</a>.
          </p>

          <h4>4. Processing of Health Data in the User Profile (Art. 9 GDPR)</h4>
          <p>
            In the optional user profile you can provide information about your skin and hair,
            including skin type, skin conditions (e.g. acne, rosacea, atopic dermatitis),
            sensitivities and hair problems. <strong>This information may constitute health data
            within the meaning of Art. 4(15) GDPR</strong> and, as a special category of personal
            data, is subject to the enhanced protection of Art. 9 GDPR.
          </p>
          <p>
            <strong>Purpose of processing:</strong><br/>
            The profile data is used exclusively to tailor the AI analysis of cosmetic products to
            your individual skin needs.
          </p>
          <p>
            <strong>Legal basis:</strong><br/>
            Processing is carried out exclusively on the basis of your <strong>express consent</strong>
            pursuant to Art. 9(2)(a) GDPR, which you give when saving the profile by ticking the
            corresponding checkbox.
          </p>
          <p>
            <strong>Withdrawal:</strong><br/>
            You may withdraw this consent at any time with effect for the future by deleting your
            profile or contacting us by email. Withdrawal does not affect the lawfulness of processing
            carried out up to that point.
          </p>
          <p>
            <strong>Storage:</strong><br/>
            The profile data is stored in our database (Supabase, see section 6) and retained only for
            as long as you maintain an account with us.
          </p>

          <h4>5. Use of Google Sign-In (optional)</h4>
          <p>
            If you sign in with your Google account, we process your name and email address to manage
            your user account and display your scan history. The legal basis is Art. 6(1)(a) GDPR.
            You can have your account and all associated data deleted at any time by contacting us by
            email.
          </p>

          <h4>6. Processor: Supabase</h4>
          <p>
            For storing user data (account, scan history, user profile, shared analysis results) we
            use the service <strong>Supabase</strong> (Supabase Inc., 970 Toa Payoh North, Singapore).
            Supabase acts as a processor pursuant to Art. 28 GDPR. A data processing agreement (DPA)
            is in place with Supabase.{' '}
            <strong>Data transfers to third countries are based on Standard Contractual Clauses
            pursuant to Art. 46(2)(c) GDPR.</strong>{' '}
            The data is stored on servers within the EU (Frankfurt, AWS eu-central-1).
            Further information:{' '}
            <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#B89F7A] hover:underline">https://supabase.com/privacy</a>.
          </p>

          <h4>7. Analytics Service: PostHog</h4>
          <p>
            With your consent (cookie consent) we use <strong>PostHog</strong> (PostHog Inc.,
            965 Mission St, San Francisco, CA 94103, USA; EU server: eu.i.posthog.com) for anonymised
            usage analytics. Events such as started and completed analyses are recorded — without any
            personal content. PostHog respects the browser&apos;s Do-Not-Track signal. The legal basis
            is Art. 6(1)(a) GDPR in conjunction with Section 25(1) TDDDG (German Telecommunications
            Digital Services Data Protection Act). Without your consent, PostHog is not initialised.
          </p>

          <h4>8. Cookies and Local Storage (Section 25 TDDDG)</h4>
          <p>
            Our website uses cookies as well as the browser&apos;s local storage (localStorage)
            pursuant to Section 25 TDDDG. Technically necessary storage (e.g. session data for
            authentication) takes place without separate consent on the basis of Section 25(2)(2)
            TDDDG. Your express consent is required for analytics cookies (PostHog).
          </p>
          <p>
            You can disable the storage of cookies in your browser settings. Please note that this may
            limit the functionality of our website.
          </p>

          <h4>9. Data Security</h4>
          <p>
            We use technical and organisational security measures to protect your data against
            manipulation, loss, destruction or unauthorised access. This site uses SSL/TLS encryption
            for secure data transmission.
          </p>

          <h4>10. Transfer to Third Countries</h4>
          <p>
            The processing of your image data by Google Gemini may also take place in third countries
            outside the EU/EEA (in particular the USA). Google LLC is certified under the EU-US Data
            Privacy Framework, ensuring an adequate level of data protection (Art. 45 GDPR). PostHog
            processes data on EU servers.
          </p>

          <h4>11. Your Rights as a Data Subject</h4>
          <p>Under the GDPR you have the following rights vis-à-vis us:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Right of access</strong> (Art. 15 GDPR)</li>
            <li><strong>Right to rectification</strong> (Art. 16 GDPR)</li>
            <li><strong>Right to erasure</strong> (Art. 17 GDPR) — including deletion of your account and all profile data</li>
            <li><strong>Right to restriction</strong> (Art. 18 GDPR)</li>
            <li><strong>Right to data portability</strong> (Art. 20 GDPR)</li>
            <li><strong>Right to object</strong> (Art. 21 GDPR)</li>
            <li><strong>Right to withdraw consent</strong> (Art. 7(3) GDPR) — at any time without giving reasons; also applies to the express consent under Art. 9(2)(a) GDPR for health data</li>
          </ul>
          <p>
            To exercise your rights, please contact us by email at:{' '}
            <a href="mailto:yuliia.parkina@gmail.com" className="text-[#B89F7A] hover:underline">yuliia.parkina@gmail.com</a>
          </p>

          <h4>12. Right to Lodge a Complaint with the Supervisory Authority</h4>
          <p>
            You have the right to lodge a complaint with a data protection supervisory authority.
            The competent supervisory authority for Baden-Württemberg is:
          </p>
          <p>
            <strong>Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg</strong><br/>
            Lautenschlagerstraße 20<br/>
            70173 Stuttgart<br/>
            Phone: +49 711 615541-0<br/>
            Email: <a href="mailto:poststelle@lfdi.bwl.de" className="text-[#B89F7A] hover:underline">poststelle@lfdi.bwl.de</a><br/>
            Website: <a href="https://www.baden-wuerttemberg.datenschutz.de" target="_blank" rel="noopener noreferrer" className="text-[#B89F7A] hover:underline">www.baden-wuerttemberg.datenschutz.de</a>
          </p>

          <h4>13. Currency of this Privacy Policy</h4>
          <p>
            This privacy policy is currently valid and is dated March 2026. As our website develops,
            it may become necessary to amend this privacy policy.
          </p>
        </div>
  );
}

function AgbEN() {
  return (
    <div>
          <h3>General Terms and Conditions (GTC)</h3>
          <p className="text-xs text-gray-500 mb-4">As of: March 2026</p>

          <h4>1. Provider and Scope</h4>
          <p>
            These General Terms and Conditions apply to the use of the <strong>GlowKI</strong> service,
            operated by:
          </p>
          <p>
            <strong>Yuliia Parkina</strong><br/>
            GlowKI<br/>
            Wagenburgstrasse 79<br/>
            70184 Stuttgart<br/>
            Germany<br/>
            Email: <a href="mailto:yuliia.parkina@gmail.com" className="text-[#B89F7A] hover:underline">yuliia.parkina@gmail.com</a>
          </p>

          <h4>2. Description of Services</h4>
          <p>
            GlowKI is a web-based application for AI-assisted analysis of cosmetic ingredients (INCI).
            The service is offered in a free basic version and a paid premium version.
          </p>
          <p>
            <strong>Free version:</strong> up to 15 scans per day, up to 10 &quot;Pay Attention&quot;
            analyses per day, up to 3 AI questions per day.
          </p>
          <p>
            <strong>Premium version:</strong> unlimited scans, unlimited &quot;Pay Attention&quot;
            analyses, up to 10 AI questions per day, full scan history.
          </p>
          <p>
            The analysis results serve general information purposes only and do
            <strong> not constitute medical, dermatological or doctor&apos;s advice</strong>.
            In the event of skin conditions or health complaints, please consult a doctor or pharmacist.
          </p>

          <h4>3. Conclusion of Contract and Premium Subscription</h4>
          <p>
            By clicking &quot;Upgrade to Premium&quot; and completing the payment process via Stripe,
            a subscription contract is concluded between you and Yuliia Parkina (GlowKI). The contract
            is concluded in German or English.
          </p>
          <p>
            The price is <strong>€4.99 per month</strong> (incl. statutory VAT where applicable).
            Billing takes place monthly in advance via the payment service provider Stripe.
            Accepted payment methods: credit card.
          </p>

          <h4>4. Right of Withdrawal</h4>
          <p>
            <strong>Withdrawal instructions pursuant to Section 355 BGB (German Civil Code)</strong>
          </p>
          <p>
            You have the right to withdraw from this contract within
            <strong> 14 days without giving any reason</strong>. The withdrawal period is 14 days from
            the day the contract is concluded.
          </p>
          <p>
            To exercise your right of withdrawal, you must inform us:
          </p>
          <p>
            <strong>Yuliia Parkina, GlowKI</strong><br/>
            Wagenburgstrasse 79, 70184 Stuttgart<br/>
            Email: <a href="mailto:yuliia.parkina@gmail.com" className="text-[#B89F7A] hover:underline">yuliia.parkina@gmail.com</a>
          </p>
          <p>
            by means of a clear statement (e.g. an email) of your decision to withdraw from this
            contract.
          </p>
          <p>
            <strong>Consequences of withdrawal:</strong> If you withdraw from this contract, we will
            refund all payments we have received from you without undue delay and at the latest within
            14 days from the day on which we receive notification of your withdrawal. For this refund
            we will use the same means of payment that you used for the original transaction.
          </p>
          <p className="text-xs bg-amber-50 border border-amber-200 rounded p-3 mt-2">
            <strong>Note on early commencement:</strong> If you expressly request that the service
            begin before the end of the withdrawal period and you nevertheless exercise your right of
            withdrawal, you must pay us a reasonable amount for the services provided up to the time of
            withdrawal.
          </p>

          <h4>5. Termination of the Subscription</h4>
          <p>
            The premium subscription automatically renews for one month at a time unless cancelled.
            You can cancel the subscription at any time with effect from the end of the current billing
            period by contacting us by email at{' '}
            <a href="mailto:yuliia.parkina@gmail.com" className="text-[#B89F7A] hover:underline">yuliia.parkina@gmail.com</a>.{' '}
            After cancellation, access remains until the end of the paid period.
          </p>

          <h4>6. Availability and Liability</h4>
          <p>
            We strive for high availability of the service but do not guarantee uninterrupted
            accessibility. Maintenance work and technical faults are possible.
          </p>
          <p>
            GlowKI&apos;s liability is limited to intent and gross negligence, unless an essential
            contractual obligation is breached. No warranty is given for the accuracy, completeness or
            timeliness of the AI-generated analysis results.
          </p>

          <h4>7. Rights of Use and Prohibited Use</h4>
          <p>
            You receive a simple, non-transferable right to use the service for personal,
            non-commercial purposes. The following are prohibited in particular: automated data
            retrieval (scraping), resale of analysis results, and any use that violates applicable law.
          </p>

          <h4>8. Amendments to the GTC</h4>
          <p>
            We reserve the right to amend these GTC with at least 30 days&apos; notice. You will be
            informed of material changes by email. If you do not object within 30 days, the new GTC are
            deemed accepted.
          </p>

          <h4>9. Applicable Law and Place of Jurisdiction</h4>
          <p>
            The law of the Federal Republic of Germany applies. The place of jurisdiction for merchants
            and legal entities is Stuttgart.
          </p>
        </div>
  );
}

// ── Language-aware exports ────────────────────────────────────────────────────
// German → authoritative German original. All other languages → English (the
// international fallback). Add further locales by branching here.
export function PrivacyPolicyContent({ lang }: { lang: Language }) {
  return lang === 'de' ? <PrivacyDE /> : <PrivacyEN />;
}

export function AGBContent({ lang }: { lang: Language }) {
  return lang === 'de' ? <AgbDE /> : <AgbEN />;
}

export function ImpressumContent() {
  return (
    <div>
      <h3>Impressum</h3>
      <p><strong>Angaben gemäß § 5 DDG:</strong></p>
      <p>
        Yuliia Parkina<br/>
        GlowKI<br/>
        Wagenburgstrasse 79<br/>
        70184 Stuttgart<br/>
        Deutschland
      </p>
      <p>
        <strong>Kontakt:</strong><br/>
        E-Mail: <a href="mailto:yuliia.parkina@gmail.com" className="text-[#B89F7A] hover:underline">yuliia.parkina@gmail.com</a><br/>
        Telefon: <a href="tel:+4915121302531" className="text-[#B89F7A] hover:underline">+49 151 21302531</a>
      </p>
      <p>
        <strong>Verantwortlich für den Inhalt:</strong><br/>
        Yuliia Parkina (Anschrift wie oben)
      </p>
      <p>
        <strong>Umsatzsteuer:</strong><br/>
        Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).
      </p>
      <p><strong>EU-Streitschlichtung:</strong><br/>
      Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
      <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-[#B89F7A] hover:underline">
        https://ec.europa.eu/consumers/odr/
      </a>.<br/>
      Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
    </div>
  );
}
