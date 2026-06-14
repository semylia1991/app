import React from 'react';
import { X } from 'lucide-react';
import { Language } from '../i18n';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

const guideContent: Record<Language, {
  heroEyebrow: string;
  heroTitle: string;
  heroTitleEm: string;
  heroSubtitle: string;

  introLabel: string;
  introTitle: string;
  introTitleEm: string;
  introQuote: string;
  introBody: string;

  stepsLabel: string;
  stepsTitle: string;
  stepsTitleEm: string;
  steps: { num: string; title: string; desc: string }[];

  reportLabel: string;
  reportTitle: string;
  reportTitleEm: string;
  reportIntro: string;
  features: { icon: string; title: string; desc: string }[];

  badgesLabel: string;
  badgesTitle: string;
  badgesTitleEm: string;
  badgesIntro: string;
  badges: { dot: string; label: string; desc: string }[];

  profileLabel: string;
  profileTitle: string;
  profileTitleEm: string;
  profileIntro: string;
  tips: { icon: string; title: string; desc: string }[];

  tipsLabel: string;
  tipsTitle: string;
  tipsTitleEm: string;
  photoTips: { icon: string; title: string; desc: string }[];

  faqLabel: string;
  faqTitle: string;
  faqTitleEm: string;
  faqs: { q: string; a: string }[];

  founderQuote: string;
  disclaimer: string;
}> = {
  en: {
    heroEyebrow: 'GlowKI — User Guide',
    heroTitle: 'Standing in the drugstore,',
    heroTitleEm: 'wondering which one to pick?',
    heroSubtitle: 'One photo. Your answer. No chemistry degree needed.',

    introLabel: 'Introduction',
    introTitle: 'Cosmetic formulas are no longer a',
    introTitleEm: 'mystery',
    introQuote: '"I used to just grab whatever looked nice. Now I actually know what I\'m buying."',
    introBody: 'GlowKI is a smart cosmetic ingredient analyzer. Photograph a cream, serum, shampoo or any other product — the app instantly tells you which components are safe, what requires caution, how to use the product correctly, and what alternatives exist.',

    stepsLabel: 'How it works',
    stepsTitle: 'Five steps to a',
    stepsTitleEm: 'full analysis',
    steps: [
      { num: '01', title: 'Take a photo of the label', desc: 'Point your camera at the ingredient list on the back of the packaging — or the whole product. The clearer the text, the more accurate the result.' },
      { num: '02', title: 'Tap — and wait 10 seconds', desc: 'Check the consent box and press Analyze. Known products come back almost instantly from cache. New ones take around 10 seconds.' },
      { num: '03', title: "See exactly what's in it — for your skin", desc: 'You get a full breakdown: every ingredient rated, a usage guide, warnings, and alternatives. No chemistry degree needed.' },
      { num: '04', title: 'Ask follow-up questions', desc: 'After the analysis, an "Ask AI" chat appears. Ask anything about the product — compatibility with retinol, suitability for sensitive skin, what to use before or after.' },
          ],

    reportLabel: 'What you get',
    reportTitle: 'Report',
    reportTitleEm: 'sections',
    reportIntro: 'Every analysis contains several collapsible sections. Tap any one to expand details.',
    features: [
      { icon: '🛡️', title: 'Overall Analysis', desc: 'A concise verdict on the formula: what it is, what the formula looks like, and what to pay attention to first.' },
      { icon: '🌿', title: 'Ingredients', desc: 'Full ingredient list with descriptions and a colour-coded safety rating. No abbreviations — plain language only.' },
      { icon: '📋', title: 'Usage', desc: 'Step-by-step guide: who it suits, how to apply, how much, how often, and where it fits in your skincare routine.' },
      { icon: '✨', title: 'Benefits', desc: 'What this product actually does for your skin or hair — tied to specific active ingredients.' },
      { icon: '🟡', title: 'Side Effects', desc: 'Possible reactions by category: irritation, allergies, effects from prolonged use.' },
      { icon: '⚡', title: 'Compatibility', desc: 'Which actives and products work well together, and what should not be used at the same time.' },
      { icon: '🔄', title: 'Alternatives', desc: '3–5 real products with a similar formula — in case something didn\'t suit you or the product is unavailable.' },
      { icon: '📝', title: 'Pay Attention', desc: 'Personal analysis based on your preferences and interests. AI automatically matches the formula to your interests and shows ✅ / ⚠️ / ⛔️ for each criterion. Tap a row to reveal an explanation with specific ingredients.' },
    ],

    badgesLabel: 'Colour markers',
    badgesTitle: 'What the safety',
    badgesTitleEm: 'badges mean',
    badgesIntro: 'Every ingredient receives one of three ratings based on data from international cosmetic databases.',
    badges: [
      { dot: '🟢', label: 'Safe', desc: 'The ingredient is well-studied, widely used, and raises no concerns according to current scientific data. Suitable for most skin types.' },
      { dot: '🟡', label: 'Caution', desc: 'The component may cause a reaction in people with sensitive skin, allergies, or specific conditions. A patch test before use is recommended.' },
      { dot: '🔴', label: 'Higher Risk', desc: 'The ingredient has documented risks: hormonal activity, high allergenic potential, bans in certain countries, or negative research findings.' },
    ],

    profileLabel: 'Personalisation by preferences',
    profileTitle: 'Analysis tailored to',
    profileTitleEm: 'you',
    profileIntro: 'Register and fill in your profile — every analysis will then take your personal characteristics into account automatically.',
    tips: [
      { icon: '🌟', title: 'Skin Type', desc: 'Oily, dry, combination — the AI considers this when evaluating ingredients and gives relevant recommendations.' },
      { icon: '🌺', title: 'Sensitivity & Reactions', desc: 'Indicate intolerance to fragrances, alcohol or essential oils — the AI will highlight these ingredients in every analysis.' },
      { icon: '🌧', title: 'Skin Conditions', desc: 'Acne, enlarged pores, uneven tone, redness — describe your concerns in Settings so they are factored into every report.' },
      { icon: '☘️', title: 'Hair & Scalp', desc: 'For shampoos, masks and hair care — specify hair type, scalp condition and any problems for accurate hair product analysis.' },
    ],

    tipsLabel: 'Tips',
    tipsTitle: 'How to get the best',
    tipsTitleEm: 'results',
    photoTips: [
      { icon: '📸', title: 'Shoot in good lighting', desc: 'Avoid shadows and glare. Even, natural light or a white background works best. The clearer the ingredient text, the more accurate the recognition.' },
      { icon: '🔍', title: 'Photograph the INCI list', desc: 'Find the section labelled "Ingredients" or "INCI" on the packaging. If it\'s absent, a photo of the whole product also works.' },
      { icon: '💾', title: 'Save results (sign in)', desc: 'Signed-in users store up to 20 recent scans. Return to any previous analysis without re-scanning.' },
      { icon: '📲', title: 'Install on your phone', desc: 'GlowKI is a PWA. In your mobile browser tap "Add to Home Screen" — the app installs like a native app, no app store needed.' },
    ],

    faqLabel: 'FAQ',
    faqTitle: 'Frequently',
    faqTitleEm: 'asked questions',
    faqs: [
      { q: 'Do I need to be a beauty expert to use this?', a: 'Not at all. You just take a photo. GlowKI reads the label and shows you what matters for your preferences — in plain language.' },
      { q: 'What if I already bought the product?', a: "Scan it anyway. You'll know what's in it — and whether to keep using it or replace it next time." },
      { q: 'What if the photo is blurry?', a: "Try again in better light. If it still doesn't work, photograph just the ingredient list up close." },
      { q: 'My photos — are they saved somewhere?', a: 'No. Your photo goes to the AI for analysis only. Nothing is stored on servers.' },
      { q: 'Should I consult a doctor instead?', a: 'GlowKI is for ingredient transparency, not medical advice. For skin conditions, always see a dermatologist.' },
    ],

    founderQuote: `“I built this so you never have to guess again. One photo — and you know exactly what's in it.”`,
    disclaimer: 'GlowKI is an informational tool. The analysis is created by artificial intelligence and may contain errors or incomplete interpretations. Results are not medical advice and should not be used to diagnose or treat skin conditions.',
  },

  ru: {
    heroEyebrow: 'GlowKI — Руководство пользователя',
    heroTitle: 'Стоишь в аптеке и',
    heroTitleEm: 'не знаешь, что взять?',
    heroSubtitle: 'Одно фото. Твой ответ. Знание химии не нужно.',

    introLabel: 'Введение',
    introTitle: 'Состав косметики больше не',
    introTitleEm: 'тайна',
    introQuote: '«Раньше я просто брала то, что красиво выглядело. Теперь я знаю, что покупаю.',
    introBody: 'GlowKI — умный анализатор косметических ингредиентов. Сфотографируйте крем, сыворотку, шампунь или любой другой продукт — приложение мгновенно расскажет, какие компоненты безопасны, что требует осторожности, как правильно использовать продукт и какие аналоги есть на рынке.',

    stepsLabel: 'Инструкция',
    stepsTitle: 'Пять шагов до',
    stepsTitleEm: 'полного анализа',
    steps: [
      { num: '01', title: 'Сфотографируй состав', desc: 'Наведи камеру на список ингредиентов на обратной стороне упаковки или на весь продукт. Чем чётче текст — тем точнее результат.' },
      { num: '02', title: 'Нажми — и жди 10 секунд', desc: 'Отметь галочку согласия и нажми «Анализ». Известные продукты возвращаются почти мгновенно. Новые занимают около 10 секунд.' },
      { num: '03', title: 'Узнай, что внутри — для твоей кожи', desc: 'Ты получаешь полный разбор: каждый ингредиент с оценкой, инструкцию, предупреждения и альтернативы. Без знания химии.' },
      { num: '04', title: 'Задайте уточняющие вопросы', desc: 'После анализа появится чат «Спросить ИИ». Спросите всё о продукте — совместимость с ретинолом, подходит ли для чувствительной кожи, в каком порядке наносить.' },

    ],

    reportLabel: 'Что вы получаете',
    reportTitle: 'Разделы',
    reportTitleEm: 'отчёта',
    reportIntro: 'Каждый анализ содержит несколько разворачиваемых секций. Нажмите на любую, чтобы раскрыть подробности.',
    features: [
      { icon: '🛡️', title: 'Общий анализ', desc: 'Краткий вывод о составе: что за продукт, какова формула, на что обратить внимание в первую очередь.' },
      { icon: '🌿', title: 'Ингредиенты', desc: 'Полный список компонентов с описанием и цветовой оценкой безопасности. Никаких сокращений — только понятный язык.' },
      { icon: '📋', title: 'Применение', desc: 'Пошаговая инструкция: кому подходит, как наносить, в каком количестве, как часто и в каком порядке в уходовом ритуале.' },
      { icon: '✨', title: 'Польза', desc: 'Что конкретно делает продукт для кожи или волос — с привязкой к активным ингредиентам.' },
      { icon: '🟡', title: 'Побочные эффекты', desc: 'Возможные реакции по категориям: раздражение, аллергии, эффекты при длительном применении.' },
      { icon: '⚡', title: 'Совместимость', desc: 'С какими активами и продуктами сочетается, а что категорически не стоит использовать одновременно.' },
      { icon: '🔄', title: 'Альтернативы', desc: '3–5 реальных продуктов со схожим составом — если что-то в формуле не устроило или продукт недоступен.' },
      { icon: '📝', title: 'Обрати внимание', desc: 'Персональный анализ на основе ваших предпочтений и интересов. ИИ автоматически сопоставляет состав с вашими интересами — и показывает ✅ / ⚠️ / ⛔️ по каждому критерию. Нажмите на строку — раскроется объяснение с конкретными ингредиентами.' },
    ],

    badgesLabel: 'Цветовые маркеры',
    badgesTitle: 'Что значат значки',
    badgesTitleEm: 'безопасности',
    badgesIntro: 'Каждый ингредиент получает одну из трёх оценок на основе данных международных косметических баз.',
    badges: [
      { dot: '🟢', label: 'Безопасен', desc: 'Ингредиент хорошо изучен, широко применяется, не вызывает опасений по актуальным научным данным. Подходит для большинства типов кожи.' },
      { dot: '🟡', label: 'Требует внимания', desc: 'Может вызывать реакцию у людей с чувствительной кожей, аллергиями или конкретными состояниями. Рекомендуется патч-тест.' },
      { dot: '🔴', label: 'Повышенный риск', desc: 'Задокументированные риски: гормональная активность, высокий аллергенный потенциал, запрет в ряде стран или негативные данные исследований.' },
    ],

    profileLabel: 'Персонализация по предпочтениям',
    profileTitle: 'Анализ именно для',
    profileTitleEm: 'вас',
    profileIntro: 'Зарегистрируйтесь и заполните профиль — раздел «Обрати внимание» автоматически учтёт ваши особенности при каждом сканировании.',
    tips: [
      { icon: '🌟', title: 'Тип кожи', desc: 'Жирная, сухая, комбинированная — ИИ отразит это в разделе «Обрати внимание» для средств ухода и тональных продуктов.' },
      { icon: '🌺', title: 'Чувствительность и реакции', desc: 'Реакция на парфюмы, спирт, эфирные масла — отображается в «Обрати внимание» для всех типов продуктов, включая декоративную косметику.' },
      { icon: '🌧', title: 'Особенности кожи', desc: 'Акне, пигментация, поры, тусклость — учитываются в «Обрати внимание» для средств ухода. Для декоративной косметики показываются только релевантные критерии.' },
      { icon: '☘️', title: 'Волосы и кожа головы', desc: 'Для шампуней, масок и средств по уходу за волосами — ИИ покажет только волосяные критерии, без смешения с уходом за кожей лица.' },
    ],

    tipsLabel: 'Советы',
    tipsTitle: 'Как получить лучший',
    tipsTitleEm: 'результат',
    photoTips: [
      { icon: '📸', title: 'Снимайте при хорошем освещении', desc: 'Избегайте теней и бликов. Равномерный естественный свет или белый фон — лучший вариант. Чётче текст — точнее анализ.' },
      { icon: '🔍', title: 'Фотографируйте список INCI', desc: 'Найдите раздел «Ingredients» или «INCI» на упаковке. Если его нет — фото всего продукта тоже подойдёт.' },
      { icon: '💾', title: 'Сохраняйте результаты', desc: 'Зарегистрированные пользователи хранят до 20 последних сканирований. Возвращайтесь к анализам без повторного сканирования.' },
      { icon: '📲', title: 'Установите на телефон', desc: 'GlowKI — это PWA. В браузере телефона нажмите «Добавить на главный экран» — приложение установится как обычное, без магазина.' },
    ],

    faqLabel: 'Вопросы и ответы',
    faqTitle: 'Часто',
    faqTitleEm: 'задаваемые вопросы',
    faqs: [
      { q: 'Нужно ли разбираться в косметике, чтобы пользоваться?', a: 'Совсем нет. Просто сделай фото. GlowKI прочитает состав и покажет, что важно для твоих предпочтений — простым языком.' },
      { q: 'Почему в «Обрати внимание» не все критерии из моего профиля?', a: 'ИИ показывает только критерии, релевантные для данного типа продукта. Например, для карандаша для глаз не нужны состояния кожи — они не применимы к макияжу. Для крема — полный набор: тип кожи, чувствительность, состояния, возраст, климат.' },
      { q: 'Когда появляется раздел «Обрати внимание»?', a: 'Анализ запускается автоматически сразу после сканирования — в фоне, пока вы читаете основной результат. К моменту открытия раздела данные уже готовы.' },
      { q: 'Что если я уже купила продукт?', a: "Всё равно отсканируй. Узнаешь, что внутри — и стоит ли продолжать использовать или заменить в следующий раз." },
      { q: 'Что если фото нечёткое?', a: "Попробуй ещё раз при лучшем освещении. Если не получается — сфотографируй только список ингредиентов крупным планом." },
      { q: 'Мои фото — они где-то сохраняются?', a: 'Нет. Фото передаётся ИИ только для анализа. На серверах ничего не хранится.' },
      { q: 'Лучше сходить к врачу?', a: 'GlowKI — для прозрачности состава, не для медицинских советов. При кожных заболеваниях всегда консультируйся с дерматологом.' },
    ],

    founderQuote: '«Я создала это, чтобы вы больше никогда не гадали. Одно фото — и вы точно знаете, что внутри.»',
    disclaimer: 'GlowKI — информационный инструмент. Анализ создаётся ИИ и может содержать ошибки или неполные интерпретации. Результаты не являются медицинской консультацией.',
  },

  de: {
    heroEyebrow: 'GlowKI — Benutzerhandbuch',
    heroTitle: 'Stehst du in der Drogerie und',
    heroTitleEm: 'weißt nicht, was du nehmen sollst?',
    heroSubtitle: 'Ein Foto. Deine Antwort. Kein Chemiestudium nötig.',

    introLabel: 'Einführung',
    introTitle: 'Kosmetikformeln sind keine',
    introTitleEm: 'Geheimnisse mehr',
    introQuote: '"Früher habe ich einfach genommen, was schön aussah. Jetzt weiß ich wirklich, was ich kaufe."',
    introBody: 'GlowKI ist ein intelligenter Kosmetikinhaltsstoff-Analysator. Fotografieren Sie eine Creme, ein Serum oder ein Shampoo — die App teilt Ihnen sofort mit, welche Bestandteile sicher sind, was Vorsicht erfordert und welche Alternativen existieren.',

    stepsLabel: 'Anleitung',
    stepsTitle: 'Fünf Schritte zur',
    stepsTitleEm: 'vollständigen Analyse',
    steps: [
      { num: '01', title: 'Etikett fotografieren', desc: 'Richte die Kamera auf die Inhaltsstoffliste auf der Rückseite der Verpackung oder das ganze Produkt. Je klarer der Text, desto genauer das Ergebnis.' },
      { num: '02', title: 'Einwilligung geben und „Analysieren" tippen', desc: 'Aktivieren Sie das Einwilligungskästchen und drücken Sie die Schaltfläche. Ihr Foto wird nur für diese Analyse verwendet und nicht gespeichert.' },
      { num: '03', title: 'Sieh genau, was drin ist — für deine Haut', desc: 'Du bekommst eine vollständige Aufschlüsselung: jeden Inhaltsstoff bewertet, eine Anwendungsanleitung, Warnhinweise und Alternativen. Kein Chemiestudium nötig.' },
      { num: '04', title: 'Rückfragen stellen', desc: 'Nach der Analyse erscheint ein „KI fragen"-Chat. Fragen Sie alles zum Produkt — Verträglichkeit mit Retinol, Eignung für empfindliche Haut, Reihenfolge in der Pflegeroutine.' },
          ],

    reportLabel: 'Was Sie erhalten',
    reportTitle: 'Berichts-',
    reportTitleEm: 'abschnitte',
    reportIntro: 'Jede Analyse enthält mehrere ausklappbare Abschnitte. Tippen Sie auf einen, um die Details zu sehen.',
    features: [
      { icon: '🛡️', title: 'Gesamtanalyse', desc: 'Ein prägnantes Fazit zur Formel: was das Produkt ist, wie es aufgebaut ist und was zuerst beachtet werden sollte.' },
      { icon: '🌿', title: 'Inhaltsstoffe', desc: 'Vollständige Liste mit Beschreibungen und farbkodierter Sicherheitsbewertung. Keine Abkürzungen — nur klare Sprache.' },
      { icon: '📋', title: 'Anwendung', desc: 'Schritt-für-Schritt-Anleitung: für wen geeignet, wie und wie viel auftragen, wie oft und wo in der Pflegeroutine.' },
      { icon: '✨', title: 'Vorteile', desc: 'Was dieses Produkt für Ihre Haut oder Haare tut — bezogen auf spezifische Wirkstoffe.' },
      { icon: '🟡', title: 'Nebenwirkungen', desc: 'Mögliche Reaktionen nach Kategorie: Reizungen, Allergien, Effekte bei Langzeitanwendung.' },
      { icon: '⚡', title: 'Verträglichkeit', desc: 'Welche Wirkstoffe sich gut kombinieren lassen und was keinesfalls gleichzeitig verwendet werden sollte.' },
      { icon: '🔄', title: 'Alternativen', desc: '3–5 reale Produkte mit ähnlicher Formel — falls etwas nicht zusagt oder das Produkt nicht verfügbar ist.' },
      { icon: '📝', title: 'Beachte', desc: 'Persönliche Analyse auf Basis Ihrer Präferenzen und Interessen. Die KI gleicht die Formel automatisch mit Ihren Interessen ab und zeigt ✅ / ⚠️ / ⛔️ für jedes Kriterium. Tippen Sie auf eine Zeile für eine Erklärung mit konkreten Inhaltsstoffen.' },
    ],

    badgesLabel: 'Farbmarkierungen',
    badgesTitle: 'Was die Sicherheits-',
    badgesTitleEm: 'badges bedeuten',
    badgesIntro: 'Jeder Inhaltsstoff erhält eine von drei Bewertungen auf Basis internationaler Kosmetikdatenbanken.',
    badges: [
      { dot: '🟢', label: 'Sicher', desc: 'Der Inhaltsstoff ist gut untersucht, weit verbreitet und wirft laut aktuellen wissenschaftlichen Daten keine Bedenken auf.' },
      { dot: '🟡', label: 'Vorsicht', desc: 'Kann bei empfindlicher Haut, Allergien oder bestimmten Zuständen eine Reaktion auslösen. Patch-Test empfohlen.' },
      { dot: '🔴', label: 'Erhöhtes Risiko', desc: 'Dokumentierte Risiken: hormonelle Aktivität, hohes Allergiepotenzial, Verbote in bestimmten Ländern oder negative Forschungsergebnisse.' },
    ],

    profileLabel: 'Personalisierung nach Präferenzen',
    profileTitle: 'Analyse für',
    profileTitleEm: 'Sie',
    profileIntro: 'Registrieren Sie sich und füllen Sie Ihr Profil aus — jede Analyse berücksichtigt dann Ihre persönlichen Merkmale automatisch.',
    tips: [
      { icon: '🌟', title: 'Hauttyp', desc: 'Fettig, trocken, Mischhaut — die KI berücksichtigt dies bei der Bewertung und gibt relevante Empfehlungen.' },
      { icon: '🌺', title: 'Empfindlichkeit & Reaktionen', desc: 'Intolleranzen gegenüber Düften, Alkohol oder ätherischen Ölen angeben — die KI hebt diese in jeder Analyse hervor.' },
      { icon: '🌧', title: 'Hautmerkmale', desc: 'Ausschläge, vergrößerte Poren, Akne, ungleichmäßiger Teint — in den Einstellungen beschreiben, damit es in jeden Bericht einfließt.' },
      { icon: '☘️', title: 'Haar & Kopfhaut', desc: 'Für Shampoos, Masken und Haarpflege — Haartyp, Kopfhautzustand und Probleme angeben für präzise Analysen.' },
    ],

    tipsLabel: 'Tipps',
    tipsTitle: 'Wie Sie die besten',
    tipsTitleEm: 'Ergebnisse erzielen',
    photoTips: [
      { icon: '📸', title: 'Bei gutem Licht fotografieren', desc: 'Schatten und Reflexionen vermeiden. Gleichmäßiges natürliches Licht oder ein weißer Hintergrund eignet sich am besten.' },
      { icon: '🔍', title: 'INCI-Liste fotografieren', desc: 'Den Abschnitt „Ingredients" oder „INCI" auf der Verpackung suchen. Ist er nicht vorhanden, funktioniert auch ein Foto des gesamten Produkts.' },
      { icon: '💾', title: 'Ergebnisse speichern', desc: 'Registrierte Nutzer speichern bis zu 20 der letzten Scans. Praktisch, um zu Analysen bereits gekaufter Produkte zurückzukehren.' },
      { icon: '📲', title: 'App installieren', desc: 'GlowKI ist eine PWA. Im Browser auf „Zum Startbildschirm hinzufügen" tippen — installiert sich wie eine native App, kein App Store nötig.' },
    ],

    faqLabel: 'FAQ',
    faqTitle: 'Häufig gestellte',
    faqTitleEm: 'Fragen',
    faqs: [
      { q: 'Muss ich mich mit Kosmetik auskennen?', a: 'Überhaupt nicht. Du machst einfach ein Foto. GlowKI liest das Etikett und zeigt dir, was für deine Vorlieben wichtig ist — in klarer Sprache.' },
      { q: 'Was, wenn ich das Produkt schon gekauft habe?', a: "Scanne es trotzdem. Du weißt dann, was drin ist — und ob du es weiter verwenden oder nächstes Mal ersetzen solltest." },
      { q: 'Was, wenn das Foto unscharf ist?', a: "Versuche es bei besserem Licht nochmal. Falls es immer noch nicht klappt, fotografiere nur die Inhaltsstoffliste aus der Nähe." },
      { q: 'Meine Fotos — werden sie irgendwo gespeichert?', a: 'Nein. Dein Foto geht nur zur Analyse an die KI. Auf Servern wird nichts gespeichert.' },
      { q: 'Sollte ich lieber zum Arzt gehen?', a: 'GlowKI ist für Inhaltsstoff-Transparenz gedacht, nicht für medizinische Ratschläge. Bei Hauterkrankungen immer einen Dermatologen aufsuchen.' },
    ],

    founderQuote: `„Ich habe das entwickelt, damit du nie wieder raten musst. Ein Foto — und du weißt genau, was drin ist.“`,
    disclaimer: 'GlowKI ist ein Informationswerkzeug. Die Analyse wird von KI erstellt und kann Fehler oder unvollständige Interpretationen enthalten. Die Ergebnisse sind keine medizinische Beratung.',
  },

  uk: {
    heroEyebrow: 'GlowKI — Керівництво користувача',
    heroTitle: 'Стоїш в аптеці і',
    heroTitleEm: 'не знаєш, що взяти?',
    heroSubtitle: 'Одне фото. Твоя відповідь. Знання хімії не потрібне.',

    introLabel: 'Вступ',
    introTitle: 'Склад косметики більше не',
    introTitleEm: 'таємниця',
    introQuote: '«Раніше я просто брала те, що гарно виглядало. Тепер я знаю, що купую.»',
    introBody: 'GlowKI — розумний аналізатор косметичних інгредієнтів. Сфотографуйте крем, сироватку, шампунь або будь-який інший продукт — застосунок миттєво розповість, які компоненти безпечні, що потребує обережності, як правильно використовувати і які аналоги є на ринку.',

    stepsLabel: 'Інструкція',
    stepsTitle: "П'ять кроків до",
    stepsTitleEm: 'повного аналізу',
    steps: [
      { num: '01', title: 'Сфотографуй склад', desc: 'Наведи камеру на список інгредієнтів на зворотному боці упаковки або на весь продукт. Чим чіткіший текст — тим точніший результат.' },
      { num: '02', title: 'Натисни — і чекай 10 секунд', desc: 'Відміть галочку згоди і натисни «Аналіз». Відомі продукти повертаються майже миттєво. Нові займають близько 10 секунд.' },
      { num: '03', title: 'Дізнайся, що всередині — для твоєї шкіри', desc: 'Ти отримуєш повний розбір: кожен інгредієнт з оцінкою, інструкцію, попередження та альтернативи. Без знання хімії.' },
      { num: '04', title: 'Поставте уточнювальні запитання', desc: "Після аналізу з'явиться чат «Запитати ШІ». Запитайте все про продукт — сумісність із ретинолом, підходить для чутливої шкіри, порядок нанесення." },
          ],

    reportLabel: 'Що ви отримуєте',
    reportTitle: 'Розділи',
    reportTitleEm: 'звіту',
    reportIntro: "Кожен аналіз містить кілька розгортуваних секцій. Натисніть на будь-яку, щоб розкрити подробиці.",
    features: [
      { icon: '🛡️', title: 'Загальний аналіз', desc: 'Короткий висновок про склад: що за продукт, яка формула, на що звернути увагу насамперед.' },
      { icon: '🌿', title: 'Інгредієнти', desc: 'Повний список компонентів з описом і кольоровою оцінкою безпеки. Жодних скорочень — лише зрозуміла мова.' },
      { icon: '📋', title: 'Застосування', desc: 'Покрокова інструкція: кому підходить, як наносити, скільки, як часто і в якому порядку в догляді.' },
      { icon: '✨', title: 'Користь', desc: "Що конкретно робить продукт для шкіри або волосся — з прив'язкою до активних інгредієнтів." },
      { icon: '🟡', title: 'Побічні ефекти', desc: 'Можливі реакції за категоріями: подразнення, алергії, ефекти при тривалому застосуванні.' },
      { icon: '⚡', title: 'Сумісність', desc: 'З якими активами і продуктами поєднується, а що категорично не варто використовувати одночасно.' },
      { icon: '🔄', title: 'Альтернативи', desc: '3–5 реальних продуктів зі схожим складом — якщо щось не влаштувало або продукт недоступний.' },
      { icon: '📝', title: 'Зверни увагу', desc: 'Персональний аналіз на основі ваших вподобань та інтересів. ШІ автоматично зіставляє склад з вашими інтересами і показує ✅ / ⚠️ / ⛔️ по кожному критерію. Натисніть на рядок для пояснення з конкретними інгредієнтами.' },
    ],

    badgesLabel: 'Кольорові маркери',
    badgesTitle: 'Що означають значки',
    badgesTitleEm: 'безпеки',
    badgesIntro: 'Кожен інгредієнт отримує одну з трьох оцінок на основі даних міжнародних косметичних баз.',
    badges: [
      { dot: '🟢', label: 'Безпечний', desc: 'Інгредієнт добре вивчений, широко застосовується і не викликає занепокоєнь за актуальними науковими даними.' },
      { dot: '🟡', label: 'Потребує уваги', desc: 'Може викликати реакцію у людей із чутливою шкірою, алергіями або конкретними станами. Рекомендується патч-тест.' },
      { dot: '🔴', label: 'Підвищений ризик', desc: 'Задокументовані ризики: гормональна активність, високий алергенний потенціал, заборона в ряді країн або негативні дані досліджень.' },
    ],

    profileLabel: 'Персоналізація за вподобаннями',
    profileTitle: 'Аналіз саме для',
    profileTitleEm: 'вас',
    profileIntro: 'Зареєструйтесь і заповніть профіль — кожен аналіз автоматично враховуватиме ваші особисті особливості.',
    tips: [
      { icon: '🌟', title: 'Тип шкіри', desc: 'Жирна, суха, комбінована — ШІ врахує це при оцінці інгредієнтів і надасть актуальні рекомендації.' },
      { icon: '🌺', title: 'Чутливість та реакції', desc: 'Вкажіть непереносимість парфумів, спирту, ефірних олій — ШІ виділятиме ці інгредієнти в кожному аналізі.' },
      { icon: '🌧', title: 'Особливості шкіри', desc: 'Висипання, розширені пори, нерівний тон, почервоніння — опишіть у Налаштуваннях, щоб враховувалося в кожному звіті.' },
      { icon: '☘️', title: 'Волосся та шкіра голови', desc: 'Для шампунів, масок і засобів по догляду — вкажіть тип волосся, стан шкіри голови та проблеми для точного аналізу.' },
    ],

    tipsLabel: 'Поради',
    tipsTitle: 'Як отримати кращий',
    tipsTitleEm: 'результат',
    photoTips: [
      { icon: '📸', title: 'Знімайте при доброму освітленні', desc: 'Уникайте тіней і відблисків. Рівномірне природне світло або білий фон — найкращий варіант.' },
      { icon: '🔍', title: 'Фотографуйте список INCI', desc: 'Знайдіть розділ «Ingredients» або «INCI» на упаковці. Якщо немає — фото всього продукту теж підійде.' },
      { icon: '💾', title: 'Зберігайте результати', desc: 'Зареєстровані користувачі зберігають до 20 останніх сканувань. Повертайтесь до аналізів без повторного сканування.' },
      { icon: '📲', title: 'Встановіть на телефон', desc: 'GlowKI — це PWA. У браузері телефону натисніть «Додати на головний екран» — встановиться як звичайний застосунок без магазину.' },
    ],

    faqLabel: 'Запитання та відповіді',
    faqTitle: 'Поширені',
    faqTitleEm: 'запитання',
    faqs: [
      { q: 'Чи потрібно розбиратися в косметиці?', a: 'Зовсім ні. Просто зроби фото. GlowKI прочитає склад і покаже, що важливо для твоїх уподобань — зрозумілою мовою.' },
      { q: 'Що якщо я вже купила продукт?', a: "Все одно відскануй. Дізнаєшся, що всередині — і чи варто продовжувати використовувати або замінити наступного разу." },
      { q: 'Що якщо фото нечітке?', a: "Спробуй ще раз при кращому освітленні. Якщо не виходить — сфотографуй лише список інгредієнтів великим планом." },
      { q: 'Мої фото — вони десь зберігаються?', a: 'Ні. Фото передається ШІ лише для аналізу. На серверах нічого не зберігається.' },
      { q: 'Краще сходити до лікаря?', a: 'GlowKI — для прозорості складу, не для медичних порад. При шкірних захворюваннях завжди консультуйся з дерматологом.' },
    ],

    founderQuote: '«Я створила це, щоб ви більше ніколи не гадали. Одне фото — і ви точно знаєте, що всередині.»',
    disclaimer: 'GlowKI — інформаційний інструмент. Аналіз створюється ШІ і може містити помилки або неповні інтерпретації. Результати не є медичною консультацією.',
  },

  es: {
    heroEyebrow: 'GlowKI — Guía de usuario',
    heroTitle: '¿En la farmacia sin saber',
    heroTitleEm: 'qué elegir?',
    heroSubtitle: 'Una foto. Tu respuesta. Sin necesidad de saber química.',

    introLabel: 'Introducción',
    introTitle: 'Las fórmulas cosméticas ya no son un',
    introTitleEm: 'misterio',
    introQuote: '"Antes cogía lo que tuviera mejor pinta. Ahora sé exactamente lo que compro."',
    introBody: 'GlowKI es un analizador inteligente de ingredientes cosméticos. Fotografía una crema, suero, champú o cualquier otro producto — la app te dice al instante qué componentes son seguros, qué requiere precaución y qué alternativas existen.',

    stepsLabel: 'Instrucciones',
    stepsTitle: 'Cinco pasos para un',
    stepsTitleEm: 'análisis completo',
    steps: [
      { num: '01', title: 'Fotografía la etiqueta', desc: 'Apunta la cámara a la lista de ingredientes en la parte trasera del envase o al producto entero. Cuanto más claro el texto, más preciso el resultado.' },
      { num: '02', title: 'Pulsa — y espera 10 segundos', desc: 'Marca la casilla y pulsa Analizar. Los productos conocidos aparecen casi al instante. Los nuevos tardan unos 10 segundos.' },
      { num: '03', title: 'Ve exactamente qué tiene — para tu piel', desc: 'Obtienes un desglose completo: cada ingrediente valorado, guía de uso, advertencias y alternativas. Sin necesidad de saber química.' },
      { num: '04', title: 'Haz preguntas de seguimiento', desc: 'Tras el análisis aparece un chat "Preguntar a la IA". Pregunta lo que quieras — compatibilidad con retinol, piel sensible, orden de aplicación.' },
          ],

    reportLabel: 'Lo que obtienes',
    reportTitle: 'Secciones del',
    reportTitleEm: 'informe',
    reportIntro: 'Cada análisis contiene varias secciones desplegables. Toca cualquiera para ver los detalles.',
    features: [
      { icon: '🛡️', title: 'Análisis general', desc: 'Un veredicto conciso sobre la fórmula: qué es, cómo está compuesta y qué hay que tener en cuenta primero.' },
      { icon: '🌿', title: 'Ingredientes', desc: 'Lista completa con descripciones y calificación de seguridad codificada por colores. Sin abreviaturas — solo lenguaje claro.' },
      { icon: '📋', title: 'Uso', desc: 'Guía paso a paso: para quién es adecuado, cómo aplicar, cuánto, con qué frecuencia y dónde en la rutina.' },
      { icon: '✨', title: 'Beneficios', desc: 'Lo que este producto hace realmente por tu piel o cabello — vinculado a ingredientes activos específicos.' },
      { icon: '🟡', title: 'Efectos secundarios', desc: 'Posibles reacciones por categoría: irritación, alergias, efectos del uso prolongado.' },
      { icon: '⚡', title: 'Compatibilidad', desc: 'Qué activos y productos combinan bien y qué definitivamente no debe usarse al mismo tiempo.' },
      { icon: '🔄', title: 'Alternativas', desc: '3–5 productos reales con fórmula similar — si algo no convenció o el producto no está disponible.' },
      { icon: '📝', title: 'Presta atención', desc: 'Análisis personal basado en tus preferencias e intereses. La IA compara automáticamente la fórmula con tus intereses y muestra ✅ / ⚠️ / ⛔️ por cada criterio. Toca una fila para ver la explicación con ingredientes específicos.' },
    ],

    badgesLabel: 'Marcadores de color',
    badgesTitle: 'Qué significan las insignias de',
    badgesTitleEm: 'seguridad',
    badgesIntro: 'Cada ingrediente recibe una de tres calificaciones basadas en datos de bases de datos cosméticas internacionales.',
    badges: [
      { dot: '🟢', label: 'Seguro', desc: 'Ingrediente bien estudiado, ampliamente utilizado y sin preocupaciones según los datos científicos actuales.' },
      { dot: '🟡', label: 'Precaución', desc: 'Puede causar reacción en personas con piel sensible, alergias o condiciones específicas. Se recomienda prueba de parche.' },
      { dot: '🔴', label: 'Mayor riesgo', desc: 'Riesgos documentados: actividad hormonal, alto potencial alergénico, prohibiciones en ciertos países o resultados negativos de investigación.' },
    ],

    profileLabel: 'Personalización por preferencias',
    profileTitle: 'Análisis adaptado a',
    profileTitleEm: 'ti',
    profileIntro: 'Regístrate y completa tu perfil — cada análisis tendrá en cuenta tus características personales automáticamente.',
    tips: [
      { icon: '🌟', title: 'Tipo de piel', desc: 'Grasa, seca, mixta — la IA lo considera al evaluar los ingredientes y da recomendaciones relevantes.' },
      { icon: '🌺', title: 'Sensibilidad y reacciones', desc: 'Indica intolerancia a fragancias, alcohol o aceites esenciales — la IA los resaltará en cada análisis.' },
      { icon: '🌧', title: 'Condiciones de la piel', desc: 'Acné, poros dilatados, tono irregular, rojeces — descríbelas en Ajustes para que se incluyan en cada informe.' },
      { icon: '☘️', title: 'Cabello y cuero cabelludo', desc: 'Para champús, mascarillas y productos capilares — especifica tipo de cabello, estado del cuero cabelludo y problemas.' },
    ],

    tipsLabel: 'Consejos',
    tipsTitle: 'Cómo obtener los mejores',
    tipsTitleEm: 'resultados',
    photoTips: [
      { icon: '📸', title: 'Fotografía con buena iluminación', desc: 'Evita sombras y reflejos. La luz natural uniforme o un fondo blanco funcionan mejor.' },
      { icon: '🔍', title: 'Fotografía la lista INCI', desc: 'Busca la sección "Ingredients" o "INCI" en el envase. Si no está, una foto del producto completo también funciona.' },
      { icon: '💾', title: 'Guarda resultados', desc: 'Los usuarios registrados almacenan hasta 20 escaneos recientes. Vuelve a cualquier análisis anterior sin re-escanear.' },
      { icon: '📲', title: 'Instala en tu teléfono', desc: 'GlowKI es una PWA. En el navegador móvil toca "Añadir a pantalla de inicio" — se instala como una app nativa, sin tienda.' },
    ],

    faqLabel: 'Preguntas frecuentes',
    faqTitle: 'Preguntas',
    faqTitleEm: 'frecuentes',
    faqs: [
      { q: '¿Necesito entender de cosmética para usarlo?', a: 'Para nada. Solo haz una foto. GlowKI lee la etiqueta y te muestra lo que importa para tus preferencias — en lenguaje claro.' },
      { q: '¿Y si ya compré el producto?', a: "Escanéalo igualmente. Sabrás qué lleva — y si vale la pena seguir usándolo o cambiarlo la próxima vez." },
      { q: '¿Qué pasa si la foto sale movida?', a: "Inténtalo de nuevo con mejor luz. Si no funciona, fotografía solo la lista de ingredientes de cerca." },
      { q: 'Mis fotos — ¿se guardan en algún sitio?', a: 'No. Tu foto va a la IA solo para el análisis. Nada se almacena en servidores.' },
      { q: '¿Debería consultar a un médico?', a: 'GlowKI es para la transparencia de ingredientes, no para consejos médicos. Para problemas de piel, consulta siempre a un dermatólogo.' },
    ],

    founderQuote: `«Lo creé para que nunca más tengas que adivinar. Una foto — y sabes exactamente qué hay dentro.»`,
    disclaimer: 'GlowKI es una herramienta informativa. El análisis es creado por IA y puede contener errores o interpretaciones incompletas. Los resultados no son consejo médico.',
  },

  fr: {
    heroEyebrow: 'GlowKI — Guide d\'utilisation',
    heroTitle: 'En pharmacie sans savoir',
    heroTitleEm: 'quoi choisir ?',
    heroSubtitle: 'Une photo. Ta réponse. Pas besoin de diplôme en chimie.',

    introLabel: 'Introduction',
    introTitle: 'Les formules cosmétiques ne sont plus un',
    introTitleEm: 'mystère',
    introQuote: '"Avant je prenais ce qui avait l\'air bien. Maintenant je sais vraiment ce que j\'achète."',
    introBody: 'GlowKI est un analyseur intelligent d\'ingrédients cosmétiques Photographie une crème, un sérum ou un shampoing — l\'application te dit instantanément quels composants sont sûrs, ce qui nécessite de la prudence et quelles alternatives existent.',

    stepsLabel: 'Mode d\'emploi',
    stepsTitle: 'Cinq étapes pour une',
    stepsTitleEm: 'analyse complète',
    steps: [
      { num: '01', title: "Prends une photo de l'étiquette", desc: "Pointe ta caméra sur la liste des ingrédients au dos de l'emballage ou sur le produit entier. Plus le texte est net, plus le résultat est précis." },
      { num: '02', title: 'Appuie — et attends 10 secondes', desc: "Coche la case de consentement et appuie sur Analyser. Les produits connus apparaissent presque instantanément. Les nouveaux prennent environ 10 secondes." },
      { num: '03', title: "Vois exactement ce qu'il y a dedans — pour ta peau", desc: "Tu obtiens une analyse complète : chaque ingrédient évalué, un guide d'utilisation, des avertissements et des alternatives. Sans avoir fait de chimie." },
      { num: '04', title: 'Pose des questions complémentaires', desc: 'Après l\'analyse, un chat « Demander à l\'IA » apparaît. Pose toutes tes questions — compatibilité avec le rétinol, peaux sensibles, ordre d\'application.' },
          ],

    reportLabel: 'Ce que tu obtiens',
    reportTitle: 'Sections du',
    reportTitleEm: 'rapport',
    reportIntro: 'Chaque analyse contient plusieurs sections dépliables. Appuie sur l\'une d\'elles pour afficher les détails.',
    features: [
      { icon: '🛡️', title: 'Analyse générale', desc: 'Un verdict concis sur la formule : ce qu\'est le produit, comment il est composé et à quoi prêter attention en premier.' },
      { icon: '🌿', title: 'Ingrédients', desc: 'Liste complète avec descriptions et note de sécurité codée par couleur. Pas d\'abréviations — seulement un langage clair.' },
      { icon: '📋', title: 'Utilisation', desc: 'Guide pas à pas : pour qui c\'est adapté, comment appliquer, quelle quantité, à quelle fréquence et où dans la routine beauté.' },
      { icon: '✨', title: 'Bienfaits', desc: 'Ce que ce produit fait réellement pour ta peau ou tes cheveux — lié à des ingrédients actifs spécifiques.' },
      { icon: '🟡', title: 'Effets secondaires', desc: 'Réactions possibles par catégorie : irritations, allergies, effets d\'une utilisation prolongée.' },
      { icon: '⚡', title: 'Compatibilité', desc: 'Quels actifs se combinent bien et ce qui ne doit pas être utilisé en même temps.' },
      { icon: '🔄', title: 'Alternatives', desc: '3 à 5 produits réels avec une formule similaire — si quelque chose ne convenait pas ou si le produit est indisponible.' },
      { icon: '📝', title: 'Fais attention', desc: 'Analyse personnelle basée sur tes préférences et intérêts. L\'IA compare automatiquement la formule à tes intérêts et affiche ✅ / ⚠️ / ⛔️ pour chaque critère. Appuie sur une ligne pour l\'explication avec les ingrédients spécifiques.' },
    ],

    badgesLabel: 'Marqueurs de couleur',
    badgesTitle: 'Ce que signifient les badges de',
    badgesTitleEm: 'sécurité',
    badgesIntro: 'Chaque ingrédient reçoit l\'une des trois notes basées sur les données des bases de données cosmétiques internationales.',
    badges: [
      { dot: '🟢', label: 'Sûr', desc: 'L\'ingrédient est bien étudié, largement utilisé et ne soulève aucune préoccupation selon les données scientifiques actuelles.' },
      { dot: '🟡', label: 'Prudence', desc: 'Peut provoquer une réaction chez les personnes à peau sensible, avec des allergies ou des conditions spécifiques. Test cutané recommandé.' },
      { dot: '🔴', label: 'Risque élevé', desc: 'Risques documentés : activité hormonale, fort potentiel allergène, interdictions dans certains pays ou résultats négatifs de recherche.' },
    ],

    profileLabel: 'Personnalisation par préférences',
    profileTitle: 'Analyse adaptée à',
    profileTitleEm: 'toi',
    profileIntro: 'Inscris-toi et remplis ton profil — chaque analyse tiendra compte de tes caractéristiques personnelles automatiquement.',
    tips: [
      { icon: '🌟', title: 'Type de peau', desc: 'Grasse, sèche, mixte — l\'IA en tient compte lors de l\'évaluation et donne des recommandations pertinentes.' },
      { icon: '🌺', title: 'Sensibilité et réactions', desc: 'Indique les intolérances aux parfums, à l\'alcool ou aux huiles essentielles — l\'IA les mettra en évidence dans chaque analyse.' },
      { icon: '🌧', title: 'Conditions cutanées', desc: 'Acné, pores dilatés, teint irrégulier, rougeurs — décris-les dans les Paramètres pour qu\'ils soient pris en compte dans chaque rapport.' },
      { icon: '☘️', title: 'Cheveux & cuir chevelu', desc: 'Pour les shampoings, masques et soins capillaires — précise le type de cheveux, l\'état du cuir chevelu et les problèmes.' },
    ],

    tipsLabel: 'Conseils',
    tipsTitle: 'Comment obtenir les meilleurs',
    tipsTitleEm: 'résultats',
    photoTips: [
      { icon: '📸', title: 'Photographie dans une bonne lumière', desc: 'Évite les ombres et les reflets. Une lumière naturelle uniforme ou un fond blanc fonctionne le mieux.' },
      { icon: '🔍', title: 'Photographie la liste INCI', desc: 'Cherche la section « Ingredients » ou « INCI » sur l\'emballage. Si elle n\'y est pas, une photo du produit entier fonctionne aussi.' },
      { icon: '💾', title: 'Sauvegarde les résultats', desc: 'Les utilisateurs enregistrés stockent jusqu\'à 20 scans récents. Reviens à n\'importe quelle analyse sans re-scanner.' },
      { icon: '📲', title: 'Installe sur ton téléphone', desc: 'GlowKI est une PWA. Dans le navigateur mobile, appuie sur « Ajouter à l\'écran d\'accueil » — s\'installe comme une app native, sans store.' },
    ],

    faqLabel: 'Questions fréquentes',
    faqTitle: 'Questions',
    faqTitleEm: 'fréquemment posées',
    faqs: [
      { q: "Faut-il s'y connaître en cosmétique ?", a: "Pas du tout. Tu fais juste une photo. GlowKI lit l'étiquette et te montre ce qui compte pour tes préférences — en langage clair." },
      { q: "Et si j'ai déjà acheté le produit ?", a: "Scanne-le quand même. Tu sauras ce qu'il contient — et si ça vaut la peine de continuer à l'utiliser ou de le remplacer." },
      { q: "Et si la photo est floue ?", a: "Réessaie avec une meilleure lumière. Si ça ne marche toujours pas, photographie uniquement la liste des ingrédients de près." },
      { q: "Mes photos — elles sont sauvegardées quelque part ?", a: "Non. Ta photo va uniquement à l'IA pour l'analyse. Rien n'est stocké sur des serveurs." },
      { q: "Vaut-il mieux consulter un médecin ?", a: "GlowKI sert à la transparence des ingrédients, pas aux conseils médicaux. Pour les problèmes de peau, consulte toujours un dermatologue." },
    ],

    founderQuote: `«Je l'ai créé pour que tu n'aies plus jamais à deviner. Une photo — et tu sais exactement ce qu'il y a dedans.»`,
    disclaimer: 'GlowKI est un outil informatif. L\'analyse est créée par IA et peut contenir des erreurs ou des interprétations incomplètes. Les résultats ne constituent pas un avis médical.',
  },

  it: {
    heroEyebrow: 'GlowKI — Guida utente',
    heroTitle: 'In farmacia senza sapere',
    heroTitleEm: 'cosa scegliere?',
    heroSubtitle: 'Una foto. La tua risposta. Nessuna laurea in chimica.',

    introLabel: 'Introduzione',
    introTitle: 'Le formule cosmetiche non sono più un',
    introTitleEm: 'mistero',
    introQuote: '"Prima prendevo quello che sembrava bello. Ora so davvero cosa compro."',
    introBody: 'GlowKI è un analizzatore intelligente di ingredienti cosmetici Fotografa una crema, un siero o uno shampoo — l\'app ti dice immediatamente quali componenti sono sicuri, cosa richiede cautela e quali alternative esistono.',

    stepsLabel: 'Istruzioni',
    stepsTitle: 'Cinque passi per un\'analisi',
    stepsTitleEm: 'completa',
    steps: [
      { num: '01', title: "Fotografa l'etichetta", desc: 'Fotografa il retro della confezione con la lista INCI o l\'intero prodotto. Più nitida è la foto e più chiaro il testo, più precisa è l\'analisi.' },
      { num: '02', title: 'Premi — e aspetta 10 secondi', desc: 'Spunta la casella di consenso e premi il pulsante. La tua foto viene inviata all\'IA solo per questa analisi e non viene archiviata.' },
      { num: '03', title: 'Ricevi l\'analisi completa', desc: 'L\'IA legge la formula, verifica database internazionali (EWG, CosDNA, EU CosIng) e restituisce un report strutturato. I prodotti noti vengono caricati dalla cache — quasi istantaneamente.' },
      { num: '04', title: 'Fai domande di approfondimento', desc: 'Dopo l\'analisi appare una chat "Chiedi all\'IA". Chiedi tutto sul prodotto — compatibilità con retinolo, idoneità per pelle sensibile, ordine di applicazione.' },
          ],

    reportLabel: 'Cosa ottieni',
    reportTitle: 'Sezioni del',
    reportTitleEm: 'report',
    reportIntro: 'Ogni analisi contiene diverse sezioni espandibili. Tocca una qualsiasi per vedere i dettagli.',
    features: [
      { icon: '🛡️', title: 'Analisi generale', desc: 'Un verdetto conciso sulla formula: cos\'è il prodotto, com\'è composto e a cosa prestare attenzione prima di tutto.' },
      { icon: '🌿', title: 'Ingredienti', desc: 'Elenco completo con descrizioni e valutazione della sicurezza codificata a colori. Nessuna abbreviazione — solo linguaggio chiaro.' },
      { icon: '📋', title: 'Utilizzo', desc: 'Guida passo passo: per chi è adatto, come applicare, quanto, con quale frequenza e dove nella routine di cura.' },
      { icon: '✨', title: 'Benefici', desc: 'Cosa fa davvero questo prodotto per la tua pelle o i tuoi capelli — collegato a ingredienti attivi specifici.' },
      { icon: '🟡', title: 'Effetti collaterali', desc: 'Possibili reazioni per categoria: irritazione, allergie, effetti dall\'uso prolungato.' },
      { icon: '⚡', title: 'Compatibilità', desc: 'Quali attivi si combinano bene e cosa non dovrebbe essere usato contemporaneamente.' },
      { icon: '🔄', title: 'Alternative', desc: '3–5 prodotti reali con formula simile — se qualcosa non ha convinto o il prodotto non è disponibile.' },
      { icon: '📝', title: 'Presta attenzione', desc: 'Analisi personale basata sulle tue preferenze e interessi. L\'IA confronta automaticamente la formula con i tuoi interessi e mostra ✅ / ⚠️ / ⛔️ per ogni criterio. Tocca una riga per la spiegazione con ingredienti specifici.' },
    ],

    badgesLabel: 'Marcatori di colore',
    badgesTitle: 'Cosa significano i badge di',
    badgesTitleEm: 'sicurezza',
    badgesIntro: 'Ogni ingrediente riceve una di tre valutazioni basate su dati di database cosmetici internazionali.',
    badges: [
      { dot: '🟢', label: 'Sicuro', desc: 'L\'ingrediente è ben studiato, ampiamente utilizzato e non solleva preoccupazioni secondo i dati scientifici attuali.' },
      { dot: '🟡', label: 'Attenzione', desc: 'Può causare reazioni in persone con pelle sensibile, allergie o condizioni specifiche. Test cutaneo consigliato prima dell\'uso.' },
      { dot: '🔴', label: 'Rischio elevato', desc: 'Rischi documentati: attività ormonale, alto potenziale allergenico, divieti in certi paesi o risultati di ricerca negativi.' },
    ],

    profileLabel: 'Personalizzazione per preferenze',
    profileTitle: 'Analisi pensata per',
    profileTitleEm: 'te',
    profileIntro: 'Registrati e compila il tuo profilo — ogni analisi terrà conto delle tue caratteristiche personali automaticamente.',
    tips: [
      { icon: '🌟', title: 'Tipo di pelle', desc: 'Grassa, secca, mista — l\'IA lo considera nella valutazione e fornisce raccomandazioni pertinenti.' },
      { icon: '🌺', title: 'Sensibilità e reazioni', desc: 'Indica intolleranze a fragranze, alcol o oli essenziali — l\'IA li evidenzierà in ogni analisi.' },
      { icon: '🌧', title: 'Condizioni della pelle', desc: 'Acne, pori dilatati, incarnato non uniforme, rossori — descrivili nelle Impostazioni per includerli in ogni report.' },
      { icon: '☘️', title: 'Capelli e cuoio capelluto', desc: 'Per shampoo, maschere e prodotti capillari — specifica tipo di capelli, condizioni del cuoio capelluto e problemi.' },
    ],

    tipsLabel: 'Consigli',
    tipsTitle: 'Come ottenere i migliori',
    tipsTitleEm: 'risultati',
    photoTips: [
      { icon: '📸', title: 'Fotografa con buona illuminazione', desc: 'Evita ombre e riflessi sulla confezione. La luce naturale uniforme o uno sfondo bianco funzionano meglio.' },
      { icon: '🔍', title: 'Fotografa la lista INCI', desc: 'Cerca la sezione "Ingredients" o "INCI" sulla confezione. Se non c\'è, funziona anche una foto dell\'intero prodotto.' },
      { icon: '💾', title: 'Salva i risultati', desc: 'Gli utenti registrati conservano fino a 20 scansioni recenti. Torna a qualsiasi analisi precedente senza ri-scansionare.' },
      { icon: '📲', title: 'Installa sul telefono', desc: 'GlowKI è una PWA. Nel browser mobile tocca "Aggiungi alla schermata Home" — si installa come app nativa, senza store.' },
    ],

    faqLabel: 'Domande frequenti',
    faqTitle: 'Domande',
    faqTitleEm: 'frequenti',
    faqs: [
      { q: "Devo essere esperta di cosmetici?", a: "Per niente. Fai solo una foto. GlowKI legge l'etichetta e ti mostra cosa conta per le tue preferenze — in parole semplici." },
      { q: "E se ho già comprato il prodotto?", a: "Scansionalo comunque. Saprai cosa contiene — e se vale la pena continuare a usarlo o sostituirlo la prossima volta." },
      { q: "E se la foto è sfocata?", a: "Riprova con una luce migliore. Se ancora non funziona, fotografa solo la lista degli ingredienti da vicino." },
      { q: "Le mie foto vengono salvate da qualche parte?", a: "No. La tua foto va all'IA solo per l'analisi. Niente viene archiviato sui server." },
      { q: "Dovrei consultare un medico?", a: "GlowKI serve per la trasparenza degli ingredienti, non per consigli medici. Per le condizioni della pelle, consulta sempre un dermatologo." },
    ],

    founderQuote: `«L'ho creato perché tu non debba più indovinare. Una foto — e sai esattamente cosa c'è dentro.»`,
    disclaimer: 'GlowKI è uno strumento informativo. L\'analisi è creata dall\'IA e può contenere errori o interpretazioni incomplete. I risultati non costituiscono un consiglio medico.',
  },

  tr: {
    heroEyebrow: 'GlowKI — Kullanım Kılavuzu',
    heroTitle: 'Eczanede durmuş',
    heroTitleEm: 'ne alacağını bilemiyor musun?',
    heroSubtitle: 'Bir fotoğraf. Cevabın. Kimya bilgisine gerek yok.',

    introLabel: 'Giriş',
    introTitle: 'Kozmetik formüller artık bir',
    introTitleEm: 'sır değil',
    introQuote: '"Eskiden sadece güzel görünene bakardım. Artık ne aldığımı gerçekten biliyorum."',
    introBody: 'GlowKI akıllı bir kozmetik içerik analizörüdür. Bir krem, serum veya şampuan fotoğraflayın — uygulama hangi bileşenlerin güvenli olduğunu, nelerin dikkat gerektirdiğini ve alternatifleri anında söyler.',

    stepsLabel: 'Nasıl çalışır',
    stepsTitle: 'Tam analize',
    stepsTitleEm: 'beş adım',
    steps: [
      { num: '01', title: 'Etiketi fotoğrafla', desc: 'Kameranı ambalajın arkasındaki içerik listesine veya ürünün tamamına yönelt. Metin ne kadar net olursa sonuç o kadar doğru olur.' },
      { num: '02', title: 'Bas — ve 10 saniye bekle', desc: "Onay kutusunu işaretle ve Analiz Et'e bas. Bilinen ürünler neredeyse anında gelir. Yeniler yaklaşık 10 saniye sürer." },
      { num: '03', title: 'İçinde tam olarak ne olduğunu gör — cildin için', desc: 'Eksiksiz bir analiz alırsın: her içerik değerlendirilmiş, kullanım kılavuzu, uyarılar ve alternatifler. Kimya bilgisi gerektirmez.' },
      { num: '04', title: 'Takip soruları sor', desc: 'Analizden sonra "YZ\'ye Sor" sohbeti belirir. Ürün hakkında her şeyi sorabilirsiniz — retinol uyumluluğu, hassas cilt için uygunluk, uygulama sırası.' },
          ],

    reportLabel: 'Ne elde edersiniz',
    reportTitle: 'Rapor',
    reportTitleEm: 'bölümleri',
    reportIntro: 'Her analiz birkaç katlanabilir bölüm içerir. Ayrıntıları görmek için herhangi birine dokunun.',
    features: [
      { icon: '🛡️', title: 'Genel Analiz', desc: 'Formül hakkında kısa bir karar: ne olduğu, nasıl bir formülü olduğu ve önce neye dikkat edilmesi gerektiği.' },
      { icon: '🌿', title: 'İçerikler', desc: 'Açıklamalar ve renk kodlu güvenlik değerlendirmesiyle tam içerik listesi. Kısaltma yok — sadece anlaşılır dil.' },
      { icon: '📋', title: 'Kullanım', desc: 'Adım adım kılavuz: kime uygun, nasıl uygulanır, ne kadar, ne sıklıkla ve bakım rutinindeki yeri.' },
      { icon: '✨', title: 'Faydalar', desc: 'Bu ürünün cildiniz veya saçınız için gerçekte ne yaptığı — belirli aktif içeriklere bağlı olarak.' },
      { icon: '🟡', title: 'Yan Etkiler', desc: 'Kategoriye göre olası reaksiyonlar: tahriş, alerjiler, uzun süreli kullanım etkileri.' },
      { icon: '⚡', title: 'Uyumluluk', desc: 'Hangi aktifler birlikte kullanılabilir ve hangilerinin kesinlikle aynı anda kullanılmaması gerektiği.' },
      { icon: '🔄', title: 'Alternatifler', desc: 'Benzer formüle sahip 3–5 gerçek ürün — bir şey tatmin etmediyse veya ürün mevcut değilse.' },
      { icon: '📝', title: 'Dikkat et', desc: 'Tercihlerinize ve ilgi alanlarınıza dayalı kişisel analiz. YZ, formülü otomatik olarak ilgi alanlarınızla eşleştirir ve her kriter için ✅ / ⚠️ / ⛔️ gösterir. Açıklama için bir satıra dokunun.' },
      
    ],

    badgesLabel: 'Renk işaretçileri',
    badgesTitle: 'Güvenlik rozetleri ne',
    badgesTitleEm: 'anlama gelir',
    badgesIntro: 'Her içerik, uluslararası kozmetik veritabanlarından gelen verilere dayalı üç değerlendirmeden birini alır.',
    badges: [
      { dot: '🟢', label: 'Güvenli', desc: 'İçerik iyi incelenmiş, yaygın olarak kullanılmakta ve mevcut bilimsel verilere göre endişe yaratmamaktadır.' },
      { dot: '🟡', label: 'Dikkat', desc: 'Hassas ciltli, alerjisi olan veya belirli durumları olan kişilerde reaksiyona yol açabilir. Yama testi önerilir.' },
      { dot: '🔴', label: 'Yüksek Risk', desc: 'Belgelenmiş riskler: hormonal aktivite, yüksek alerjenik potansiyel, bazı ülkelerde yasaklar veya olumsuz araştırma bulguları.' },
    ],

    profileLabel: 'Tercihlere göre kişiselleştirme',
    profileTitle: 'Size özel',
    profileTitleEm: 'analiz',
    profileIntro: 'Kaydolun ve profilinizi doldurun — her analiz kişisel özelliklerinizi otomatik olarak dikkate alacak.',
    tips: [
      { icon: '🌟', title: 'Cilt Tipi', desc: 'Yağlı, kuru, karma — YZ içerikleri değerlendirirken bunu dikkate alır ve ilgili öneriler sunar.' },
      { icon: '🌺', title: 'Hassasiyet ve Reaksiyonlar', desc: 'Parfüm, alkol veya uçucu yağlara tahammülsüzlüğünüzü belirtin — YZ bunları her analizde vurgular.' },
      { icon: '🌧', title: 'Cilt Durumları', desc: 'Akne, geniş gözenekler, düzensiz ten, kızarıklık — Ayarlar\'da tanımlayın, her rapora dahil edilsin.' },
      { icon: '☘️', title: 'Saç ve Kafa Derisi', desc: 'Şampuan, maske ve saç bakımı için — saç tipinizi, kafa derisi durumunuzu ve sorunlarınızı belirtin.' },
    ],

    tipsLabel: 'İpuçları',
    tipsTitle: 'En iyi sonuçları nasıl',
    tipsTitleEm: 'elde edersiniz',
    photoTips: [
      { icon: '📸', title: 'İyi ışıkta fotoğraflayın', desc: 'Ambalajdaki gölgelerden ve yansımalardan kaçının. Eşit doğal ışık veya beyaz arka plan en iyi sonucu verir.' },
      { icon: '🔍', title: 'INCI listesini fotoğraflayın', desc: 'Ambalajda "Ingredients" veya "INCI" etiketli bölümü arayın. Yoksa ürünün tamamının fotoğrafı da işe yarar.' },
      { icon: '💾', title: 'Sonuçları kaydedin', desc: 'Kayıtlı kullanıcılar son 20 taramayı saklar. Yeniden tarama yapmadan önceki analizlere dönün.' },
      { icon: '📲', title: 'Uygulamayı yükleyin', desc: 'GlowKI bir PWA\'dır. Mobil tarayıcınızda "Ana ekrana ekle"ye dokunun — mağaza olmadan yerel uygulama gibi yüklenir.' },
    ],

    faqLabel: 'Sık Sorulan Sorular',
    faqTitle: 'Sık sorulan',
    faqTitleEm: 'sorular',
    faqs: [
      { q: 'Kozmetik konusunda uzman olmam gerekiyor mu?', a: 'Hiç gerekmiyor. Sadece bir fotoğraf çek. GlowKI etiketi okur ve tercihlerine göre ne önemli olduğunu gösterir — açık bir dilde.' },
      { q: 'Ürünü çoktan satın aldıysam?', a: 'Yine de tara. İçinde ne olduğunu öğrenirsin — ve bir dahaki sefere kullanmaya devam edip etmemen ya da değiştirmen gerekip gerekmediğini.' },
      { q: 'Fotoğraf bulanık çıkarsa?', a: 'Daha iyi ışıkta tekrar dene. Yine de çalışmazsa yalnızca içerik listesini yakından fotoğrafla.' },
      { q: 'Fotoğraflarım bir yere kaydediliyor mu?', a: "Hayır. Fotoğrafın yalnızca analiz için YZ'ye gönderilir. Sunucularda hiçbir şey saklanmaz." },
      { q: 'Bunun yerine doktora gitmeli miyim?', a: 'GlowKI içerik şeffaflığı içindir, tıbbi tavsiye değil. Cilt sorunları için her zaman bir dermatologa başvur.' },
    ],

    founderQuote: `“Bunu bir daha tahmin etmek zorunda kalmaman için yaptım. Bir fotoğraf — ve içinde ne olduğunu tam olarak biliyorsun.”`,
    disclaimer: 'GlowKI bir bilgi aracıdır. Analiz yapay zeka tarafından oluşturulur ve hatalar veya eksik yorumlar içerebilir. Sonuçlar tıbbi tavsiye niteliği taşımaz.',
  },
};

export function UserGuideModal({ isOpen, onClose, lang }: UserGuideModalProps) {
  const c = guideContent[lang];
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-[#FDFBF7] shadow-2xl my-8" style={{ border: '1px solid #D4C3A3' }}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#FDFBF7] border-b border-[#D4C3A3] px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] tracking-[0.4em] uppercase text-[#B89F7A] font-medium">{c.heroEyebrow}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#B89F7A] hover:text-[#2C3E50] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 md:px-10 pb-10">
          {/* Hero */}
          <div className="text-center py-10 border-b border-[#D4C3A3]/60">
            <h1 className="text-4xl md:text-5xl font-serif text-[#2C3E50] leading-tight mb-3">
              {c.heroTitle} <em className="italic text-[#B89F7A]">{c.heroTitleEm}</em>
            </h1>
            <p className="text-sm text-[#4A4A4A] italic font-serif mt-4 max-w-md mx-auto leading-relaxed">{c.heroSubtitle}</p>
          </div>

          {/* Intro */}
          <div className="py-8 border-b border-[#D4C3A3]/60">
            <span className="text-[9px] tracking-[0.5em] uppercase text-[#B89F7A] font-medium block mb-3">{c.introLabel}</span>
            <h2 className="text-2xl font-serif text-[#2C3E50] mb-5">
              {c.introTitle} <em className="italic text-[#B89F7A]">{c.introTitleEm}</em>
            </h2>
            <div className="bg-gradient-to-br from-[#F5F0E8] to-[#EDE6D6] border-l-2 border-[#B89F7A] px-5 py-4 mb-5 rounded-r-sm">
              <p className="font-serif italic text-[#2C3E50] text-sm leading-relaxed">{c.introQuote}</p>
            </div>
            <p className="text-sm text-[#4A4A4A] leading-relaxed">{c.introBody}</p>
            <div className="mt-6 flex gap-3 items-start border border-[#D4C3A3]/50 p-4 rounded-sm bg-white/40">
              <img
                src="/yuliia.jpg"
                alt="Yuliia Parkina"
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
              <div>
                <p className="text-xs font-semibold text-[#2C3E50]">Yuliia Parkina · Founder</p>
                <p className="text-xs text-[#4A4A4A] leading-relaxed mt-1 italic">
                  {c.founderQuote}
                </p>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="py-8 border-b border-[#D4C3A3]/60 bg-[#2C3E50]/[0.02] -mx-6 md:-mx-10 px-6 md:px-10">
            <span className="text-[9px] tracking-[0.5em] uppercase text-[#B89F7A] font-medium block mb-3">{c.stepsLabel}</span>
            <h2 className="text-2xl font-serif text-[#2C3E50] mb-6">
              {c.stepsTitle} <em className="italic text-[#B89F7A]">{c.stepsTitleEm}</em>
            </h2>
            <div className="space-y-6">
              {c.steps.map((step) => (
                <div key={step.num} className="flex gap-4 border-b border-[#D4C3A3]/30 pb-6 last:border-0 last:pb-0">
                  <div className="text-3xl font-serif text-[#D4C3A3] shrink-0 w-10 leading-none pt-0.5">{step.num}</div>
                  <div>
                    <p className="text-sm font-semibold text-[#2C3E50] mb-1">{step.title}</p>
                    <p className="text-xs text-[#4A4A4A] leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report sections */}
          <div className="py-8 border-b border-[#D4C3A3]/60">
            <span className="text-[9px] tracking-[0.5em] uppercase text-[#B89F7A] font-medium block mb-3">{c.reportLabel}</span>
            <h2 className="text-2xl font-serif text-[#2C3E50] mb-2">
              {c.reportTitle} <em className="italic text-[#B89F7A]">{c.reportTitleEm}</em>
            </h2>
            <p className="text-xs text-[#4A4A4A] mb-5">{c.reportIntro}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {c.features.map((f) => (
                <div key={f.title} className="flex gap-3 p-3 border border-[#D4C3A3]/50 rounded-sm bg-white/50">
                  <span className="text-xl shrink-0">{f.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-[#2C3E50]">{f.title}</p>
                    <p className="text-xs text-[#4A4A4A] leading-relaxed mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Safety badges */}
          <div className="py-8 border-b border-[#D4C3A3]/60">
            <span className="text-[9px] tracking-[0.5em] uppercase text-[#B89F7A] font-medium block mb-3">{c.badgesLabel}</span>
            <h2 className="text-2xl font-serif text-[#2C3E50] mb-2">
              {c.badgesTitle} <em className="italic text-[#B89F7A]">{c.badgesTitleEm}</em>
            </h2>
            <p className="text-xs text-[#4A4A4A] mb-5">{c.badgesIntro}</p>
            <div className="space-y-3">
              {c.badges.map((b) => (
                <div key={b.label} className="flex gap-3 items-start">
                  <span className="text-lg shrink-0 mt-0.5">{b.dot}</span>
                  <div>
                    <p className="text-xs font-semibold text-[#2C3E50]">{b.label}</p>
                    <p className="text-xs text-[#4A4A4A] leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Profile */}
          <div className="py-8 border-b border-[#D4C3A3]/60 bg-[#2C3E50]/[0.02] -mx-6 md:-mx-10 px-6 md:px-10">
            <span className="text-[9px] tracking-[0.5em] uppercase text-[#B89F7A] font-medium block mb-3">{c.profileLabel}</span>
            <h2 className="text-2xl font-serif text-[#2C3E50] mb-2">
              {c.profileTitle} <em className="italic text-[#B89F7A]">{c.profileTitleEm}</em>
            </h2>
            <p className="text-xs text-[#4A4A4A] mb-5">{c.profileIntro}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {c.tips.map((tip) => (
                <div key={tip.title} className="flex gap-3 p-3 border border-[#D4C3A3]/50 rounded-sm bg-white/40">
                  <span className="text-xl shrink-0">{tip.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-[#2C3E50]">{tip.title}</p>
                    <p className="text-xs text-[#4A4A4A] leading-relaxed mt-0.5">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Photo tips */}
          <div className="py-8 border-b border-[#D4C3A3]/60">
            <span className="text-[9px] tracking-[0.5em] uppercase text-[#B89F7A] font-medium block mb-3">{c.tipsLabel}</span>
            <h2 className="text-2xl font-serif text-[#2C3E50] mb-5">
              {c.tipsTitle} <em className="italic text-[#B89F7A]">{c.tipsTitleEm}</em>
            </h2>
            <div className="space-y-4">
              {c.photoTips.map((tip) => (
                <div key={tip.title} className="flex gap-3">
                  <span className="text-xl shrink-0">{tip.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-[#2C3E50]">{tip.title}</p>
                    <p className="text-xs text-[#4A4A4A] leading-relaxed mt-0.5">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="py-8 border-b border-[#D4C3A3]/60">
            <span className="text-[9px] tracking-[0.5em] uppercase text-[#B89F7A] font-medium block mb-3">{c.faqLabel}</span>
            <h2 className="text-2xl font-serif text-[#2C3E50] mb-5">
              {c.faqTitle} <em className="italic text-[#B89F7A]">{c.faqTitleEm}</em>
            </h2>
            <div className="space-y-2">
              {c.faqs.map((faq, i) => (
                <div key={i} className="border border-[#D4C3A3]/50 rounded-sm overflow-hidden">
                  <button
                    className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#B89F7A]/5 transition-colors"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="text-xs font-semibold text-[#2C3E50]">{faq.q}</span>
                    <span className="text-[#B89F7A] shrink-0 text-sm">{openFaq === i ? '−' : '+'}</span>
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4 pt-1 text-xs text-[#4A4A4A] leading-relaxed border-t border-[#D4C3A3]/30">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="pt-6">
            <p className="text-[10px] text-[#B89F7A] text-center leading-relaxed">
              For information only · Not medical advice · Always consult a dermatologist for skin conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
