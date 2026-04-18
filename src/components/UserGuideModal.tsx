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

  disclaimer: string;
}> = {
  en: {
    heroEyebrow: 'GlowKey AI — User Guide',
    heroTitle: 'Know what you',
    heroTitleEm: 'apply',
    heroSubtitle: 'AI reads cosmetic ingredients and explains each one in your language',

    introLabel: 'Introduction',
    introTitle: 'Cosmetic formulas are no longer a',
    introTitleEm: 'mystery',
    introQuote: '"Have you ever wondered what Dimethicone, Phenoxyethanol or Butylated Hydroxytoluene on a label actually means? GlowKey AI decodes it in seconds." — GlowKey AI Team',
    introBody: 'GlowKey AI is a smart cosmetic ingredient analyzer. Photograph a cream, serum, shampoo or any other product, and the app instantly tells you which components are safe, what requires caution, how to use the product correctly, and what alternatives exist on the market.',

    stepsLabel: 'How it works',
    stepsTitle: 'Four steps to a',
    stepsTitleEm: 'full analysis',
    steps: [
      { num: '01', title: 'Upload a photo', desc: 'Photograph the back of the packaging with the ingredient list (INCI) or the entire product. Any image works — the app will extract the relevant data. The sharper the photo, the more accurate the analysis.' },
      { num: '02', title: 'Give consent and tap "Analyze"', desc: 'Check the consent box and press the button. Your photo is used only for this analysis and is not stored on servers without your knowledge.' },
      { num: '03', title: 'Receive a full breakdown', desc: 'The AI reads the formula, identifies each ingredient against international databases (EWG, CosDNA, EU CosIng) and returns a structured report with a safety rating, usage guide, warnings, and alternatives.' },
      { num: '04', title: 'Ask follow-up questions', desc: 'After the analysis, an "Ask AI" chat appears. You can ask up to 10 questions about the product — for example, "is it compatible with retinol?" or "is it suitable for sensitive skin?"' },
    ],

    reportLabel: 'What you get',
    reportTitle: 'Report',
    reportTitleEm: 'sections',
    reportIntro: 'Every analysis contains nine collapsible sections. Tap any one to expand details.',
    features: [
      { icon: '🛡️', title: 'Overall Analysis', desc: 'A concise verdict on the formula: what it is, what the formula looks like, and what to pay attention to first.' },
      { icon: '🌿', title: 'Ingredients', desc: 'Full ingredient list with descriptions and a colour-coded safety rating. No abbreviations — plain language only.' },
      { icon: '📋', title: 'Usage', desc: 'Step-by-step guide: who it suits, how to apply, how much, how often, and where it fits in your skincare routine.' },
      { icon: '✨', title: 'Benefits', desc: 'What this product actually does for your skin or hair — tied to specific active ingredients.' },
      { icon: '⚠️', title: 'Side Effects', desc: 'Possible reactions by category: irritation, allergies, effects from prolonged use.' },
      { icon: '⚡', title: 'Compatibility', desc: 'Which actives and products work well together, and what should definitely not be used at the same time.' },
      { icon: '🕐', title: 'Shelf Life', desc: 'How and where to store the product to maintain its efficacy. Period after opening (PAO).' },
      { icon: '🔄', title: 'Alternatives', desc: '3–5 real products with a similar formula — in case something in the composition didn\'t suit you or the product is unavailable.' },
      { icon: '📝', title: 'Pay Attention', desc: 'An analysis based on specified skin and hair characteristics. The system takes individual preferences into account when generating recommendations.' },
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

    profileLabel: 'Your preferences',
    profileTitle: 'Analysis tailored to',
    profileTitleEm: 'your preferences',
    profileIntro: 'If you register and fill in your profile, every analysis will take your personal preferences into account.',
    tips: [
      { icon: '🌟', title: 'Skin Type', desc: 'Oily, dry, combination — the AI considers this when evaluating ingredients and gives relevant recommendations.' },
      { icon: '🌺', title: 'Sensitivity & Reactions', desc: 'If you have indicated a sensitivity to flavourings, alcohol or essential oils in your preferences, the AI system will highlight these ingredients in the analysis results.' },
      { icon: '🌧', title: 'Skin characteristics', desc: 'Skin rashes, enlarged pores, blackheads, uneven skin tone — please describe these issues in the ‘Settings’ section so that we can take them into account in our analysis.' },
      { icon: '☘️', title: 'Hair & Scalp Type', desc: 'When selecting shampoos, hair masks and hair care products, artificial intelligence takes into account data from your preferences: hair type, scalp condition and any issues specified in your settings.' },
    ],

    tipsLabel: 'Tips',
    tipsTitle: 'How to get the best',
    tipsTitleEm: 'results',
    photoTips: [
      { icon: '📸', title: 'Shoot in good lighting', desc: 'Avoid shadows and glare on the packaging. Even, natural light or a white background works best. The clearer the ingredient text, the more accurate the recognition.' },
      { icon: '🔍', title: 'Photograph the INCI list', desc: 'Look for the section labelled "Ingredients" or "INCI" on the packaging. If it\'s not there, a photo of the whole product also works — the AI will try to find data in its knowledge base.' },
      { icon: '💾', title: 'Save results (sign in)', desc: 'Registered users store up to 20 recent scans. Handy for returning to analyses of products you\'ve already bought without re-scanning.' },
      { icon: '🔗', title: 'Share results', desc: 'Tap the "Share" button to get a unique link to the analysis that you can send to a friend or save for yourself. The link opens without login.' },
    ],

    faqLabel: 'FAQ',
    faqTitle: 'Frequently',
    faqTitleEm: 'asked questions',
    faqs: [
      { q: 'Are my photos stored?', a: 'No. Images are used exclusively for analysis and are not stored on servers. Only the analysis result is saved in the database — and only if you are signed in.' },
      { q: 'How accurate is the analysis?', a: 'The AI references data from EWG Skin Deep, CosDNA, PubChem, INCI Decoder and EU CosIng. If data on a specific ingredient is unavailable, this is clearly stated — the app never invents information.' },
      { q: 'Is this medical advice?', a: 'No. GlowKey AI provides information for educational purposes. Always consult a dermatologist before changing your skincare routine, especially if you have a skin condition.' },
      { q: 'Do I need to register?', a: 'No — you can analyse products without an account. Google sign-in unlocks scan history, my preferences, and the ability to share results.' },
      { q: 'What if the AI didn\'t recognise the product?', a: 'Try taking a sharper photo specifically of the INCI list, making sure the text is clearly visible and not obscured by shadows. If the problem persists, photograph only the ingredient text section up close.' },
      { q: 'Can I install the app on my phone?', a: 'Yes. GlowKey AI is a Progressive Web App (PWA). In your phone\'s browser, tap "Add to Home Screen" and the app installs like a regular app — no app store needed.' },
    ],

    disclaimer: 'GlowKey AI is an informational tool. The analysis is created by artificial intelligence and may contain errors or incomplete interpretations. Results are not medical advice and should not be used to diagnose or treat skin conditions.',
  },

  ru: {
    heroEyebrow: 'GlowKey AI — Руководство пользователя',
    heroTitle: 'Знай, что ты',
    heroTitleEm: 'наносишь',
    heroSubtitle: 'Искусственный интеллект читает состав косметики и объясняет каждый ингредиент на вашем языке',

    introLabel: 'Введение',
    introTitle: 'Состав косметики больше не',
    introTitleEm: 'тайна',
    introQuote: '«Вы когда-нибудь задавались вопросом, что скрывается за строчкой Dimethicone, Phenoxyethanol или Butylated Hydroxytoluene на упаковке? GlowKey AI расшифрует это за секунды.» — Команда GlowKey AI',
    introBody: 'GlowKey AI — это умный анализатор косметических ингредиентов. Сфотографируйте крем, сыворотку, шампунь или любой другой продукт, и приложение мгновенно расскажет: какие компоненты безопасны, что требует осторожности, как правильно использовать продукт и какие аналоги существуют на рынке.',

    stepsLabel: 'Инструкция',
    stepsTitle: 'Четыре шага до',
    stepsTitleEm: 'полного анализа',
    steps: [
      { num: '01', title: 'Загрузите фотографию', desc: 'Сфотографируйте обратную сторону упаковки с составом (INCI) или всего продукта целиком. Подойдёт любое изображение — приложение само выделит нужные данные. Чем чётче снимок, тем точнее анализ.' },
      { num: '02', title: 'Дайте согласие и нажмите «Анализ»', desc: 'Отметьте галочку согласия на обработку изображения и нажмите кнопку. Ваше фото будет использовано только для этого анализа и не сохраняется на серверах без вашего ведома.' },
      { num: '03', title: 'Получите полный разбор', desc: 'ИИ прочитает состав, идентифицирует каждый ингредиент по международным базам данных (EWG, CosDNA, EU CosIng) и вернёт структурированный отчёт с оценкой безопасности, инструкцией, предупреждениями и альтернативами.' },
      { num: '04', title: 'Задайте уточняющие вопросы', desc: 'После анализа появится чат «Спросить ИИ». Вы можете задать до 10 вопросов о продукте — например, «совместим ли он с ретинолом?» или «подходит ли для чувствительной кожи?»' },
    ],

    reportLabel: 'Что вы получаете',
    reportTitle: 'Разделы',
    reportTitleEm: 'отчёта',
    reportIntro: 'Каждый анализ содержит девять разворачиваемых секций. Нажмите на любую, чтобы раскрыть подробности.',
    features: [
      { icon: '🛡️', title: 'Общий анализ', desc: 'Краткий вывод о составе продукта: что это такое, какова его формула, на что стоит обратить внимание в первую очередь.' },
      { icon: '🌿', title: 'Ингредиенты', desc: 'Полный список компонентов с описанием и цветовой оценкой безопасности каждого. Никаких сокращений — только понятный язык.' },
      { icon: '📋', title: 'Применение', desc: 'Пошаговая инструкция: кому подходит, как наносить, в каком количестве, как часто и в каком порядке в уходовом ритуале.' },
      { icon: '✨', title: 'Польза', desc: 'Что именно делает этот продукт для кожи или волос — с привязкой к конкретным активным ингредиентам.' },
      { icon: '⚠️', title: 'Побочные эффекты', desc: 'Возможные реакции по категориям: раздражение, аллергии, эффекты при длительном применении.' },
      { icon: '⚡', title: 'Совместимость', desc: 'С какими активами и продуктами сочетается, а что категорически не стоит использовать одновременно.' },
      { icon: '🕐', title: 'Срок хранения', desc: 'Как и где хранить продукт, чтобы он не потерял эффективность. Срок годности после вскрытия.' },
      { icon: '🔄', title: 'Альтернативы', desc: '3–5 реальных продуктов со схожим составом — на случай, если что-то в составе вас не устроило или продукт недоступен.' },
      { icon: '📝', title: 'Обрати внимание', desc: 'Анализ на основе указанных характеристик кожи и волос. Система учитывает индивидуальные предпочтения при формировании рекомендаций.' },
    ],

    badgesLabel: 'Цветовые маркеры',
    badgesTitle: 'Что значат значки',
    badgesTitleEm: 'безопасности',
    badgesIntro: 'Каждый ингредиент получает одну из трёх оценок, основанную на данных международных косметических баз.',
    badges: [
      { dot: '🟢', label: 'Безопасен', desc: 'Ингредиент хорошо изучен, широко применяется и не вызывает опасений согласно актуальным научным данным. Подходит для большинства типов кожи.' },
      { dot: '🟡', label: 'Требует внимания', desc: 'Компонент может вызывать реакцию у людей с чувствительной кожей, аллергиями или конкретными состояниями. Рекомендуется сделать патч-тест перед использованием.' },
      { dot: '🔴', label: 'Повышенный риск', desc: 'Ингредиент имеет задокументированные риски: гормональная активность, высокий аллергенный потенциал, запрет в ряде стран или негативные данные исследований.' },
    ],

    profileLabel: 'Персонализация',
    profileTitle: 'Анализ именно для',
    profileTitleEm: 'ваших предпочтений',
    profileIntro: 'Если вы зарегистрируетесь и заполните профиль, каждый анализ будет учитывать ваши личные особенности.',
    tips: [
      { icon: '🌟', title: 'Тип кожи', desc: 'Жирная, сухая, комбинированная — ИИ учтёт это при оценке ингредиентов и даст релевантные рекомендации.' },
      { icon: '🌺', title: 'Чувствительность и реакции', desc: 'Укажите, если у вас есть непереносимость парфюмов, спирта, эфирных масел — и ИИ обязательно выделит эти ингредиенты в анализе.' },
      { icon: '🌧', title: 'Особенности кожи', desc: 'Кожные высыпания, расширенные поры, угри, неровный цвет лица — пожалуйста, опишите эти проблемы в разделе «Настройки», чтобы мы могли учесть их в нашем анализе.' },
      { icon: '☘️', title: 'Тип волос и кожи головы', desc: 'Для анализа шампуней, масок и средств по уходу за волосами — укажите тип волос, состояние кожи головы и проблемы.' },
    ],

    tipsLabel: 'Советы',
    tipsTitle: 'Как получить лучший',
    tipsTitleEm: 'результат',
    photoTips: [
      { icon: '📸', title: 'Снимайте при хорошем освещении', desc: 'Избегайте теней и бликов на упаковке. Лучший вариант — равномерное естественное освещение или белый фон. Чем чётче видны буквы состава, тем точнее распознавание.' },
      { icon: '🔍', title: 'Фотографируйте именно список INCI', desc: 'Ищите раздел с заголовком «Ingredients» или «INCI» на упаковке. Если его нет — фото всего продукта тоже подойдёт, ИИ попробует найти данные в своей базе знаний.' },
      { icon: '💾', title: 'Сохраняйте результаты (войдите в аккаунт)', desc: 'Зарегистрированные пользователи хранят историю до 20 последних сканирований. Удобно возвращаться к анализам уже купленных продуктов без повторного сканирования.' },
      { icon: '🔗', title: 'Делитесь результатами', desc: 'Нажмите кнопку «Поделиться» — и вы получите уникальную ссылку на анализ, которую можно отправить подруге или сохранить для себя. Ссылка открывается без авторизации.' },
    ],

    faqLabel: 'Вопросы и ответы',
    faqTitle: 'Часто',
    faqTitleEm: 'задаваемые вопросы',
    faqs: [
      { q: 'Мои фотографии сохраняются?', a: 'Нет. Изображения используются исключительно для анализа и не хранятся на серверах. В базе данных сохраняется только результат анализа — и только если вы вошли в аккаунт.' },
      { q: 'Насколько точен анализ?', a: 'ИИ обращается к данным баз EWG Skin Deep, CosDNA, PubChem, INCI Decoder и EU CosIng. При отсутствии данных о конкретном ингредиенте это явно указывается — приложение никогда не придумывает информацию.' },
      { q: 'Это медицинская рекомендация?', a: 'Нет. GlowKey AI предоставляет информацию в образовательных целях. Всегда консультируйтесь с дерматологом перед изменением ухода, особенно при кожных заболеваниях.' },
      { q: 'Нужна ли регистрация?', a: 'Нет — анализировать можно без аккаунта. Регистрация через Google открывает историю сканирований, персональный профиль и возможность делиться результатами.' },
      { q: 'Что делать, если ИИ не распознал продукт?', a: 'Попробуйте сделать более чёткий снимок именно состава (INCI), убедитесь, что текст хорошо виден и не перекрыт тенью. Если проблема повторяется — сфотографируйте только текстовую часть с ингредиентами крупным планом.' },
      { q: 'Можно ли установить приложение на телефон?', a: 'Да. GlowKey AI — это Progressive Web App (PWA). В браузере на телефоне нажмите «Добавить на главный экран» и приложение установится как обычное без магазина приложений.' },
    ],

    disclaimer: 'GlowKey AI — это информационный инструмент. Анализ создаётся искусственным интеллектом и может содержать ошибки или неполные интерпретации. Результаты не являются медицинской консультацией и не должны использоваться для диагностики или лечения кожных заболеваний.',
  },

  de: {
    heroEyebrow: 'GlowKey AI — Benutzerhandbuch',
    heroTitle: 'Wissen, was du',
    heroTitleEm: 'aufträgst',
    heroSubtitle: 'KI liest Kosmetikinhaltsstoffe und erklärt jeden in deiner Sprache',

    introLabel: 'Einführung',
    introTitle: 'Kosmetikformeln sind keine',
    introTitleEm: 'Geheimnisse mehr',
    introQuote: '"Haben Sie sich jemals gefragt, was Dimethicone, Phenoxyethanol oder Butylated Hydroxytoluene auf einem Etikett bedeuten? GlowKey AI entschlüsselt es in Sekunden." — GlowKey AI Team',
    introBody: 'GlowKey AI ist ein intelligenter Kosmetikinhaltsstoff-Analysator. Fotografieren Sie eine Creme, ein Serum, ein Shampoo oder ein anderes Produkt, und die App teilt Ihnen sofort mit, welche Bestandteile sicher sind, was Vorsicht erfordert, wie das Produkt korrekt verwendet wird und welche Alternativen auf dem Markt existieren.',

    stepsLabel: 'Anleitung',
    stepsTitle: 'Vier Schritte zur',
    stepsTitleEm: 'vollständigen Analyse',
    steps: [
      { num: '01', title: 'Foto hochladen', desc: 'Fotografieren Sie die Rückseite der Verpackung mit der Inhaltsstoffliste (INCI) oder das gesamte Produkt. Jedes Bild funktioniert — die App extrahiert die relevanten Daten. Je schärfer das Foto, desto genauer die Analyse.' },
      { num: '02', title: 'Einwilligung geben und „Analysieren" tippen', desc: 'Aktivieren Sie das Einwilligungskästchen und drücken Sie die Schaltfläche. Ihr Foto wird nur für diese Analyse verwendet und ohne Ihr Wissen nicht auf Servern gespeichert.' },
      { num: '03', title: 'Vollständige Auswertung erhalten', desc: 'Die KI liest die Formel, identifiziert jeden Inhaltsstoff anhand internationaler Datenbanken (EWG, CosDNA, EU CosIng) und liefert einen strukturierten Bericht mit Sicherheitsbewertung, Anleitung, Warnungen und Alternativen.' },
      { num: '04', title: 'Rückfragen stellen', desc: 'Nach der Analyse erscheint ein „KI fragen"-Chat. Sie können bis zu 10 Fragen zum Produkt stellen — z. B. „Ist es mit Retinol verträglich?" oder „Ist es für empfindliche Haut geeignet?"' },
    ],

    reportLabel: 'Was Sie erhalten',
    reportTitle: 'Berichts-',
    reportTitleEm: 'abschnitte',
    reportIntro: 'Jede Analyse enthält neun ausklappbare Abschnitte. Tippen Sie auf einen, um die Details zu sehen.',
    features: [
      { icon: '🛡️', title: 'Gesamtanalyse', desc: 'Ein prägnantes Fazit zur Formel: was das Produkt ist, wie die Formel aufgebaut ist und was zuerst beachtet werden sollte.' },
      { icon: '🌿', title: 'Inhaltsstoffe', desc: 'Vollständige Inhaltsstoffliste mit Beschreibungen und farbkodierter Sicherheitsbewertung. Keine Abkürzungen — nur verständliche Sprache.' },
      { icon: '📋', title: 'Anwendung', desc: 'Schritt-für-Schritt-Anleitung: für wen geeignet, wie auftragen, wie viel, wie oft und wo in der Pflegeroutine.' },
      { icon: '✨', title: 'Vorteile', desc: 'Was dieses Produkt für Ihre Haut oder Haare tut — bezogen auf spezifische Wirkstoffe.' },
      { icon: '⚠️', title: 'Nebenwirkungen', desc: 'Mögliche Reaktionen nach Kategorie: Reizungen, Allergien, Effekte bei Langzeitanwendung.' },
      { icon: '⚡', title: 'Verträglichkeit', desc: 'Welche Wirkstoffe und Produkte gut kombinierbar sind und was auf keinen Fall gleichzeitig verwendet werden sollte.' },
      { icon: '🕐', title: 'Haltbarkeit', desc: 'Wie und wo das Produkt gelagert werden soll, um seine Wirksamkeit zu erhalten. Haltbarkeit nach dem Öffnen (PAO).' },
      { icon: '🔄', title: 'Alternativen', desc: '3–5 reale Produkte mit ähnlicher Formel — falls etwas in der Zusammensetzung nicht zusagt oder das Produkt nicht verfügbar ist.' },
      { icon: '📝', title: 'Bitte beachten Sie', desc: 'Analyse auf Basis der angegebenen Haut- und Haarmerkmale. Das System berücksichtigt individuelle Präferenzen bei der Erstellung von Empfehlungen.' },
    ],

    badgesLabel: 'Farbmarkierungen',
    badgesTitle: 'Was die Sicherheits-',
    badgesTitleEm: 'Ihre Präferenzen',
    badgesIntro: 'Jeder Inhaltsstoff erhält eine von drei Bewertungen auf Basis internationaler Kosmetikdatenbanken.',
    badges: [
      { dot: '🟢', label: 'Sicher', desc: 'Der Inhaltsstoff ist gut untersucht, weit verbreitet und wirft laut aktuellen wissenschaftlichen Daten keine Bedenken auf. Für die meisten Hauttypen geeignet.' },
      { dot: '🟡', label: 'Vorsicht', desc: 'Der Bestandteil kann bei Menschen mit empfindlicher Haut, Allergien oder bestimmten Zuständen eine Reaktion auslösen. Ein Patch-Test vor der Anwendung wird empfohlen.' },
      { dot: '🔴', label: 'Erhöhtes Risiko', desc: 'Der Inhaltsstoff hat dokumentierte Risiken: hormonelle Aktivität, hohes Allergiepotenzial, Verbote in bestimmten Ländern oder negative Forschungsergebnisse.' },
    ],

    profileLabel: 'Personalisierung',
    profileTitle: 'Analyse für',
    profileTitleEm: 'Ihre Haut',
    profileIntro: 'Wenn Sie sich registrieren und Ihr Profil ausfüllen, berücksichtigt jede Analyse Ihre persönlichen Merkmale.',
    tips: [
      { icon: '🌟', title: 'Hauttyp', desc: 'Fettig, trocken, Mischhaut — die KI berücksichtigt dies bei der Bewertung der Inhaltsstoffe und gibt relevante Empfehlungen.' },
      { icon: '🌺', title: 'Empfindlichkeit & Reaktionen', desc: 'Geben Sie an, wenn Sie Unverträglichkeiten gegenüber Düften, Alkohol oder ätherischen Ölen haben — die KI hebt diese Inhaltsstoffe in der Analyse hervor.' },
      { icon: '🌧', title: 'Hautmerkmale', desc: 'Hautausschläge, vergrößerte Poren, Akne, ungleichmäßiger Teint – bitte beschreiben Sie diese Probleme im Abschnitt „Einstellungen“, damit wir sie bei unserer Analyse berücksichtigen können.' },
      { icon: '☘️', title: 'Haar- & Kopfhauttyp', desc: 'Für die Analyse von Shampoos, Masken und Haarpflegeprodukten — geben Sie Ihren Haartyp, Kopfhautzustand und eventuelle Probleme an.' },
    ],

    tipsLabel: 'Tipps',
    tipsTitle: 'Wie Sie die besten',
    tipsTitleEm: 'Ergebnisse erzielen',
    photoTips: [
      { icon: '📸', title: 'Bei gutem Licht fotografieren', desc: 'Vermeiden Sie Schatten und Reflexionen auf der Verpackung. Gleichmäßiges natürliches Licht oder ein weißer Hintergrund eignet sich am besten.' },
      { icon: '🔍', title: 'INCI-Liste fotografieren', desc: 'Suchen Sie den Abschnitt mit der Aufschrift „Ingredients" oder „INCI" auf der Verpackung. Ist er nicht vorhanden, funktioniert auch ein Foto des gesamten Produkts.' },
      { icon: '💾', title: 'Ergebnisse speichern (anmelden)', desc: 'Registrierte Nutzer speichern bis zu 20 der letzten Scans. Praktisch, um zu Analysen bereits gekaufter Produkte zurückzukehren.' },
      { icon: '🔗', title: 'Ergebnisse teilen', desc: 'Tippen Sie auf „Teilen", um einen eindeutigen Link zur Analyse zu erhalten, den Sie an Freunde senden oder für sich selbst speichern können. Der Link öffnet sich ohne Anmeldung.' },
    ],

    faqLabel: 'FAQ',
    faqTitle: 'Häufig gestellte',
    faqTitleEm: 'Fragen',
    faqs: [
      { q: 'Werden meine Fotos gespeichert?', a: 'Nein. Bilder werden ausschließlich zur Analyse verwendet und nicht auf Servern gespeichert. In der Datenbank wird nur das Analyseergebnis gespeichert — und nur wenn Sie angemeldet sind.' },
      { q: 'Wie genau ist die Analyse?', a: 'Die KI nutzt Daten aus EWG Skin Deep, CosDNA, PubChem, INCI Decoder und EU CosIng. Fehlen Daten zu einem bestimmten Inhaltsstoff, wird dies klar angegeben — die App erfindet keine Informationen.' },
      { q: 'Ist das ein medizinischer Rat?', a: 'Nein. GlowKey AI stellt Informationen zu Bildungszwecken bereit. Konsultieren Sie immer einen Dermatologen, bevor Sie Ihre Pflegeroutine ändern.' },
      { q: 'Muss ich mich registrieren?', a: 'Nein — Sie können Produkte ohne Konto analysieren. Die Google-Anmeldung schaltet den Scan-Verlauf, ein persönliches Profil und die Möglichkeit zum Teilen von Ergebnissen frei.' },
      { q: 'Was tun, wenn die KI das Produkt nicht erkennt?', a: 'Versuchen Sie, ein schärferes Foto speziell der INCI-Liste aufzunehmen, und stellen Sie sicher, dass der Text gut sichtbar und nicht von Schatten verdeckt ist.' },
      { q: 'Kann ich die App auf meinem Telefon installieren?', a: 'Ja. GlowKey AI ist eine Progressive Web App (PWA). Tippen Sie im Browser Ihres Telefons auf „Zum Startbildschirm hinzufügen".' },
    ],

    disclaimer: 'GlowKey AI ist ein Informationswerkzeug. Die Analyse wird von künstlicher Intelligenz erstellt und kann Fehler oder unvollständige Interpretationen enthalten. Die Ergebnisse sind keine medizinische Beratung.',
  },

  uk: {
    heroEyebrow: 'GlowKey AI — Керівництво користувача',
    heroTitle: 'Знай, що ти',
    heroTitleEm: 'наносиш',
    heroSubtitle: 'Штучний інтелект читає склад косметики і пояснює кожен інгредієнт вашою мовою',

    introLabel: 'Вступ',
    introTitle: 'Склад косметики більше не',
    introTitleEm: 'таємниця',
    introQuote: '«Ви коли-небудь замислювалися, що ховається за рядком Dimethicone, Phenoxyethanol або Butylated Hydroxytoluene на упаковці? GlowKey AI розшифрує це за секунди.» — Команда GlowKey AI',
    introBody: 'GlowKey AI — це розумний аналізатор косметичних інгредієнтів. Сфотографуйте крем, сироватку, шампунь або будь-який інший продукт, і застосунок миттєво розповість: які компоненти безпечні, що потребує обережності, як правильно використовувати продукт і які аналоги існують на ринку.',

    stepsLabel: 'Інструкція',
    stepsTitle: 'Чотири кроки до',
    stepsTitleEm: 'повного аналізу',
    steps: [
      { num: '01', title: 'Завантажте фото', desc: 'Сфотографуйте зворотній бік упаковки зі складом (INCI) або весь продукт. Підійде будь-яке зображення — застосунок сам виділить потрібні дані. Чим чіткіший знімок, тим точніший аналіз.' },
      { num: '02', title: 'Надайте згоду і натисніть «Аналіз»', desc: 'Відмітьте галочку згоди на обробку зображення і натисніть кнопку. Ваше фото використовуватиметься лише для цього аналізу і не зберігається на серверах без вашого відома.' },
      { num: '03', title: 'Отримайте повний розбір', desc: 'ШІ прочитає склад, ідентифікує кожен інгредієнт за міжнародними базами даних (EWG, CosDNA, EU CosIng) і поверне структурований звіт з оцінкою безпеки, інструкцією, попередженнями та альтернативами.' },
      { num: '04', title: 'Поставте уточнювальні запитання', desc: 'Після аналізу з\'явиться чат «Запитати ШІ». Ви можете поставити до 10 запитань про продукт — наприклад, «сумісний із ретинолом?» або «підходить для чутливої шкіри?»' },
    ],

    reportLabel: 'Що ви отримуєте',
    reportTitle: 'Розділи',
    reportTitleEm: 'звіту',
    reportIntro: "Кожен аналіз містить дев'ять розгортуваних секцій. Натисніть на будь-яку, щоб розкрити подробиці.",
    features: [
      { icon: '🛡️', title: 'Загальний аналіз', desc: 'Короткий висновок про склад продукту: що це таке, яка його формула, на що варто звернути увагу в першу чергу.' },
      { icon: '🌿', title: 'Інгредієнти', desc: 'Повний список компонентів з описом і кольоровою оцінкою безпеки кожного. Жодних скорочень — лише зрозуміла мова.' },
      { icon: '📋', title: 'Застосування', desc: 'Покрокова інструкція: кому підходить, як наносити, в якій кількості, як часто і в якому порядку в догляді.' },
      { icon: '✨', title: 'Користь', desc: 'Що саме робить цей продукт для шкіри або волосся — з прив\'язкою до конкретних активних інгредієнтів.' },
      { icon: '⚠️', title: 'Побічні ефекти', desc: 'Можливі реакції за категоріями: подразнення, алергії, ефекти при тривалому застосуванні.' },
      { icon: '⚡', title: 'Сумісність', desc: 'З якими активами і продуктами поєднується, а що категорично не варто використовувати одночасно.' },
      { icon: '🕐', title: 'Термін зберігання', desc: 'Як і де зберігати продукт, щоб він не втратив ефективність. Термін придатності після відкриття.' },
      { icon: '🔄', title: 'Альтернативи', desc: '3–5 реальних продуктів зі схожим складом — на випадок, якщо щось у складі вас не влаштувало або продукт недоступний.' },
      { icon: '📝', title: 'Зверніть увагу', desc: 'Аналіз на основі вказаних характеристик шкіри та волосся. Система враховує індивідуальні вподобання при формуванні рекомендацій.' },
    ],

    badgesLabel: 'Кольорові маркери',
    badgesTitle: 'Що означають значки',
    badgesTitleEm: 'безпеки',
    badgesIntro: 'Кожен інгредієнт отримує одну з трьох оцінок, засновану на даних міжнародних косметичних баз.',
    badges: [
      { dot: '🟢', label: 'Безпечний', desc: 'Інгредієнт добре вивчений, широко застосовується і не викликає занепокоєнь згідно з актуальними науковими даними. Підходить для більшості типів шкіри.' },
      { dot: '🟡', label: 'Потребує уваги', desc: 'Компонент може викликати реакцію у людей із чутливою шкірою, алергіями або конкретними станами. Рекомендується провести патч-тест перед використанням.' },
      { dot: '🔴', label: 'Підвищений ризик', desc: 'Інгредієнт має задокументовані ризики: гормональна активність, високий алергенний потенціал, заборона в ряді країн або негативні дані досліджень.' },
    ],

    profileLabel: 'Персоналізація',
    profileTitle: 'Аналіз саме для',
    profileTitleEm: 'Ваших уподобаннь',
    profileIntro: 'Якщо ви зареєструєтесь і заповните профіль, кожен аналіз враховуватиме ваші особисті особливості.',
    tips: [
      { icon: '🌟', title: 'Тип шкіри', desc: 'Жирна, суха, комбінована — ШІ врахує це при оцінці інгредієнтів і дасть релевантні рекомендації.' },
      { icon: '🌺', title: 'Чутливість та реакції', desc: 'Вкажіть, якщо у вас є непереносимість парфумів, спирту, ефірних олій — і ШІ обов\'язково виділить ці інгредієнти в аналізі.' },
      { icon: '🌧', title: 'Особливості шкіри', desc: 'Шкірні висипання, розширені пори, вугрі, нерівний тон шкіри — будь ласка, опишіть ці проблеми в розділі «Налаштування», щоб ми могли врахувати їх у нашому аналізі.' },
      { icon: '☘️', title: 'Тип волосся та шкіри голови', desc: 'Для аналізу шампунів, масок і засобів для догляду за волоссям — вкажіть тип волосся, стан шкіри голови та проблеми.' },
    ],

    tipsLabel: 'Поради',
    tipsTitle: 'Як отримати кращий',
    tipsTitleEm: 'результат',
    photoTips: [
      { icon: '📸', title: 'Знімайте при доброму освітленні', desc: 'Уникайте тіней і відблисків на упаковці. Найкращий варіант — рівномірне природне освітлення або білий фон.' },
      { icon: '🔍', title: 'Фотографуйте саме список INCI', desc: 'Шукайте розділ із заголовком «Ingredients» або «INCI» на упаковці. Якщо його немає — фото всього продукту теж підійде.' },
      { icon: '💾', title: 'Зберігайте результати (увійдіть в акаунт)', desc: 'Зареєстровані користувачі зберігають історію до 20 останніх сканувань. Зручно повертатися до аналізів вже куплених продуктів.' },
      { icon: '🔗', title: 'Діліться результатами', desc: 'Натисніть кнопку «Поділитися» — і ви отримаєте унікальне посилання на аналіз. Посилання відкривається без авторизації.' },
    ],

    faqLabel: 'Запитання та відповіді',
    faqTitle: 'Поширені',
    faqTitleEm: 'запитання',
    faqs: [
      { q: 'Мої фотографії зберігаються?', a: 'Ні. Зображення використовуються виключно для аналізу і не зберігаються на серверах. У базі даних зберігається лише результат аналізу — і лише якщо ви увійшли в акаунт.' },
      { q: 'Наскільки точний аналіз?', a: 'ШІ звертається до даних баз EWG Skin Deep, CosDNA, PubChem, INCI Decoder та EU CosIng. За відсутності даних про конкретний інгредієнт це явно вказується.' },
      { q: 'Це медична рекомендація?', a: 'Ні. GlowKey AI надає інформацію в освітніх цілях. Завжди консультуйтеся з дерматологом перед зміною догляду.' },
      { q: 'Потрібна реєстрація?', a: 'Ні — аналізувати можна без акаунту. Реєстрація через Google відкриває історію сканувань, персональний профіль і можливість ділитися результатами.' },
      { q: 'Що робити, якщо ШІ не розпізнав продукт?', a: 'Спробуйте зробити чіткіший знімок саме складу (INCI), переконайтесь, що текст добре видно і не перекритий тінню.' },
      { q: 'Чи можна встановити застосунок на телефон?', a: 'Так. GlowKey AI — це Progressive Web App (PWA). У браузері на телефоні натисніть «Додати на головний екран».' },
    ],

    disclaimer: 'GlowKey AI — це інформаційний інструмент. Аналіз створюється штучним інтелектом і може містити помилки або неповні інтерпретації. Результати не є медичною консультацією.',
  },

  es: {
    heroEyebrow: 'GlowKey AI — Guía de usuario',
    heroTitle: 'Sabe lo que te',
    heroTitleEm: 'aplicas',
    heroSubtitle: 'La IA lee los ingredientes cosméticos y explica cada uno en tu idioma',

    introLabel: 'Introducción',
    introTitle: 'Las fórmulas cosméticas ya no son un',
    introTitleEm: 'misterio',
    introQuote: '"¿Alguna vez te has preguntado qué significa Dimethicone, Phenoxyethanol o Butylated Hydroxytoluene en una etiqueta? GlowKey AI lo descifra en segundos." — Equipo GlowKey AI',
    introBody: 'GlowKey AI es un analizador inteligente de ingredientes cosméticos. Fotografía una crema, suero, champú o cualquier otro producto, y la app te dice al instante qué componentes son seguros, qué requiere precaución, cómo usar el producto correctamente y qué alternativas existen en el mercado.',

    stepsLabel: 'Instrucciones',
    stepsTitle: 'Cuatro pasos para un',
    stepsTitleEm: 'análisis completo',
    steps: [
      { num: '01', title: 'Sube una foto', desc: 'Fotografía la parte trasera del envase con la lista de ingredientes (INCI) o el producto completo. Cualquier imagen funciona. Cuanto más nítida sea la foto, más preciso será el análisis.' },
      { num: '02', title: 'Da tu consentimiento y pulsa "Analizar"', desc: 'Marca la casilla de consentimiento y pulsa el botón. Tu foto se usa solo para este análisis y no se almacena en servidores sin tu conocimiento.' },
      { num: '03', title: 'Recibe el desglose completo', desc: 'La IA lee la fórmula, identifica cada ingrediente con bases de datos internacionales (EWG, CosDNA, EU CosIng) y devuelve un informe estructurado con calificación de seguridad, guía de uso, advertencias y alternativas.' },
      { num: '04', title: 'Haz preguntas de seguimiento', desc: 'Tras el análisis aparece un chat "Preguntar a la IA". Puedes hacer hasta 10 preguntas sobre el producto — por ejemplo, "¿es compatible con el retinol?" o "¿es apto para piel sensible?"' },
    ],

    reportLabel: 'Lo que obtienes',
    reportTitle: 'Secciones del',
    reportTitleEm: 'informe',
    reportIntro: 'Cada análisis contiene nueve secciones desplegables. Toca cualquiera para ver los detalles.',
    features: [
      { icon: '🛡️', title: 'Análisis general', desc: 'Un veredicto conciso sobre la fórmula: qué es, cómo está compuesta y qué hay que tener en cuenta primero.' },
      { icon: '🌿', title: 'Ingredientes', desc: 'Lista completa de componentes con descripciones y calificación de seguridad codificada por colores. Sin abreviaturas — solo lenguaje claro.' },
      { icon: '📋', title: 'Uso', desc: 'Guía paso a paso: para quién es adecuado, cómo aplicar, cuánto, con qué frecuencia y dónde encaja en la rutina de cuidado.' },
      { icon: '✨', title: 'Beneficios', desc: 'Lo que este producto hace realmente por tu piel o cabello — vinculado a ingredientes activos específicos.' },
      { icon: '⚠️', title: 'Efectos secundarios', desc: 'Posibles reacciones por categoría: irritación, alergias, efectos del uso prolongado.' },
      { icon: '⚡', title: 'Compatibilidad', desc: 'Qué activos y productos combinan bien, y qué definitivamente no debe usarse al mismo tiempo.' },
      { icon: '🕐', title: 'Vida útil', desc: 'Cómo y dónde almacenar el producto para mantener su eficacia. Período después de abierto (PAO).' },
      { icon: '🔄', title: 'Alternativas', desc: '3–5 productos reales con una fórmula similar — en caso de que algo en la composición no te haya convencido o el producto no esté disponible.' },
      { icon: '📝', title: 'Nota personal', desc: 'Análisis basado en las características de piel y cabello especificadas. El sistema tiene en cuenta las preferencias individuales al generar recomendaciones.' },
    ],

    badgesLabel: 'Marcadores de color',
    badgesTitle: 'Qué significan las insignias de',
    badgesTitleEm: 'seguridad',
    badgesIntro: 'Cada ingrediente recibe una de tres calificaciones basadas en datos de bases de datos cosméticas internacionales.',
    badges: [
      { dot: '🟢', label: 'Seguro', desc: 'El ingrediente está bien estudiado, ampliamente utilizado y no genera preocupaciones según los datos científicos actuales. Adecuado para la mayoría de los tipos de piel.' },
      { dot: '🟡', label: 'Precaución', desc: 'El componente puede causar reacción en personas con piel sensible, alergias o condiciones específicas. Se recomienda hacer una prueba de parche antes de usar.' },
      { dot: '🔴', label: 'Mayor riesgo', desc: 'El ingrediente tiene riesgos documentados: actividad hormonal, alto potencial alergénico, prohibiciones en ciertos países o hallazgos negativos de investigación.' },
    ],

    profileLabel: 'Personalización',
    profileTitle: 'Análisis adaptado a',
    profileTitleEm: 'tu piel',
    profileIntro: 'Si te registras y completas tu perfil, cada análisis tendrá en cuenta tus características personales.',
    tips: [
      { icon: '🌟', title: 'Tipo de piel', desc: 'Grasa, seca, mixta — la IA lo considera al evaluar los ingredientes y da recomendaciones relevantes.' },
      { icon: '🌺', title: 'Sensibilidad y reacciones', desc: 'Indica si tienes intolerancia a fragancias, alcohol o aceites esenciales — y la IA destacará esos ingredientes en el análisis.' },
      { icon: '🌧', title: 'Condiciones de la piel', desc: 'Erupciones cutáneas, poros dilatados, espinillas, tono de piel irregular: por favor, describe estos problemas en la sección «Configuración» para que podamos tenerlos en cuenta en nuestro análisis.' },
      { icon: '☘️', title: 'Tipo de cabello y cuero cabelludo', desc: 'Para el análisis de champús, mascarillas y productos capilares — especifica tu tipo de cabello, estado del cuero cabelludo y problemas.' },
    ],

    tipsLabel: 'Consejos',
    tipsTitle: 'Cómo obtener los mejores',
    tipsTitleEm: 'resultados',
    photoTips: [
      { icon: '📸', title: 'Fotografía con buena iluminación', desc: 'Evita sombras y reflejos en el envase. La luz natural uniforme o un fondo blanco funcionan mejor.' },
      { icon: '🔍', title: 'Fotografía la lista INCI', desc: 'Busca la sección etiquetada "Ingredients" o "INCI" en el envase. Si no está, una foto del producto completo también funciona.' },
      { icon: '💾', title: 'Guarda resultados (inicia sesión)', desc: 'Los usuarios registrados almacenan hasta 20 escaneos recientes. Práctico para volver a análisis de productos ya comprados.' },
      { icon: '🔗', title: 'Comparte resultados', desc: 'Toca "Compartir" para obtener un enlace único al análisis que puedes enviar a una amiga o guardar para ti. El enlace se abre sin iniciar sesión.' },
    ],

    faqLabel: 'Preguntas frecuentes',
    faqTitle: 'Preguntas',
    faqTitleEm: 'frecuentes',
    faqs: [
      { q: '¿Se almacenan mis fotos?', a: 'No. Las imágenes se usan exclusivamente para el análisis y no se almacenan en servidores. Solo el resultado del análisis se guarda — y solo si has iniciado sesión.' },
      { q: '¿Qué tan preciso es el análisis?', a: 'La IA utiliza datos de EWG Skin Deep, CosDNA, PubChem, INCI Decoder y EU CosIng. Si no hay datos sobre un ingrediente específico, se indica claramente.' },
      { q: '¿Es un consejo médico?', a: 'No. GlowKey AI proporciona información con fines educativos. Siempre consulta a un dermatólogo antes de cambiar tu rutina de cuidado.' },
      { q: '¿Necesito registrarme?', a: 'No — puedes analizar productos sin cuenta. El inicio de sesión con Google desbloquea el historial, un perfil personal y la posibilidad de compartir resultados.' },
      { q: '¿Qué pasa si la IA no reconoce el producto?', a: 'Intenta tomar una foto más nítida específicamente de la lista INCI, asegurándote de que el texto sea claramente visible y no esté oscurecido por sombras.' },
      { q: '¿Puedo instalar la app en mi teléfono?', a: 'Sí. GlowKey AI es una Progressive Web App (PWA). En el navegador de tu teléfono, toca "Añadir a pantalla de inicio".' },
    ],

    disclaimer: 'GlowKey AI es una herramienta informativa. El análisis es creado por inteligencia artificial y puede contener errores o interpretaciones incompletas. Los resultados no son consejo médico.',
  },

  fr: {
    heroEyebrow: 'GlowKey AI — Guide d\'utilisation',
    heroTitle: 'Sache ce que tu',
    heroTitleEm: 'appliques',
    heroSubtitle: 'L\'IA lit les ingrédients cosmétiques et explique chacun dans ta langue',

    introLabel: 'Introduction',
    introTitle: 'Les formules cosmétiques ne sont plus un',
    introTitleEm: 'mystère',
    introQuote: '"T\'es-tu déjà demandé ce que signifient Diméthicone, Phénoxyéthanol ou Hydroxytoluène butylé sur une étiquette ? GlowKey AI le décode en quelques secondes." — Équipe GlowKey AI',
    introBody: 'GlowKey AI est un analyseur intelligent d\'ingrédients cosmétiques. Photographie une crème, un sérum, un shampoing ou tout autre produit, et l\'application te dit instantanément quels composants sont sûrs, ce qui nécessite de la prudence, comment utiliser le produit correctement et quelles alternatives existent sur le marché.',

    stepsLabel: 'Mode d\'emploi',
    stepsTitle: 'Quatre étapes pour une',
    stepsTitleEm: 'analyse complète',
    steps: [
      { num: '01', title: 'Télécharge une photo', desc: 'Photographie le dos de l\'emballage avec la liste INCI ou le produit entier. Toute image fonctionne. Plus la photo est nette, plus l\'analyse est précise.' },
      { num: '02', title: 'Donne ton consentement et appuie sur « Analyser »', desc: 'Coche la case de consentement et appuie sur le bouton. Ta photo est utilisée uniquement pour cette analyse et n\'est pas stockée sur les serveurs à ton insu.' },
      { num: '03', title: 'Reçois l\'analyse complète', desc: 'L\'IA lit la formule, identifie chaque ingrédient via des bases de données internationales (EWG, CosDNA, EU CosIng) et renvoie un rapport structuré avec note de sécurité, guide d\'utilisation, avertissements et alternatives.' },
      { num: '04', title: 'Pose des questions complémentaires', desc: 'Après l\'analyse, un chat « Demander à l\'IA » apparaît. Tu peux poser jusqu\'à 10 questions sur le produit — par exemple, « est-il compatible avec le rétinol ? » ou « convient-il aux peaux sensibles ? »' },
    ],

    reportLabel: 'Ce que tu obtiens',
    reportTitle: 'Sections du',
    reportTitleEm: 'rapport',
    reportIntro: 'Chaque analyse contient neuf sections dépliables. Appuie sur l\'une d\'elles pour afficher les détails.',
    features: [
      { icon: '🛡️', title: 'Analyse générale', desc: 'Un verdict concis sur la formule : ce qu\'est le produit, à quoi ressemble sa formule et à quoi prêter attention en premier.' },
      { icon: '🌿', title: 'Ingrédients', desc: 'Liste complète des composants avec descriptions et note de sécurité codée par couleur. Pas d\'abréviations — seulement un langage clair.' },
      { icon: '📋', title: 'Utilisation', desc: 'Guide pas à pas : pour qui c\'est adapté, comment appliquer, quelle quantité, à quelle fréquence et où dans ta routine beauté.' },
      { icon: '✨', title: 'Bienfaits', desc: 'Ce que ce produit fait réellement pour ta peau ou tes cheveux — lié à des ingrédients actifs spécifiques.' },
      { icon: '⚠️', title: 'Effets secondaires', desc: 'Réactions possibles par catégorie : irritations, allergies, effets d\'une utilisation prolongée.' },
      { icon: '⚡', title: 'Compatibilité', desc: 'Quels actifs et produits se combinent bien, et ce qui ne doit définitivement pas être utilisé en même temps.' },
      { icon: '🕐', title: 'Durée de conservation', desc: 'Comment et où stocker le produit pour maintenir son efficacité. Période après ouverture (PAO).' },
      { icon: '🔄', title: 'Alternatives', desc: '3 à 5 produits réels avec une formule similaire — au cas où quelque chose dans la composition ne te convient pas ou si le produit est indisponible.' },
      { icon: '📝', title: 'Note personnelle', desc: 'Analyse basée sur les caractéristiques de peau et de cheveux renseignées. Le système prend en compte les préférences individuelles lors de la génération des recommandations.' },
    ],

    badgesLabel: 'Marqueurs de couleur',
    badgesTitle: 'Ce que signifient les badges de',
    badgesTitleEm: 'sécurité',
    badgesIntro: 'Chaque ingrédient reçoit l\'une des trois notes basées sur les données des bases de données cosmétiques internationales.',
    badges: [
      { dot: '🟢', label: 'Sûr', desc: 'L\'ingrédient est bien étudié, largement utilisé et ne soulève aucune préoccupation selon les données scientifiques actuelles. Adapté à la plupart des types de peau.' },
      { dot: '🟡', label: 'Prudence', desc: 'Le composant peut provoquer une réaction chez les personnes à peau sensible, avec des allergies ou des conditions spécifiques. Un test cutané avant utilisation est recommandé.' },
      { dot: '🔴', label: 'Risque élevé', desc: 'L\'ingrédient présente des risques documentés : activité hormonale, fort potentiel allergène, interdictions dans certains pays ou résultats de recherche négatifs.' },
    ],

    profileLabel: 'Personnalisation',
    profileTitle: 'Analyse adaptée à',
    profileTitleEm: 'ta peau',
    profileIntro: 'Si tu t\'inscris et remplis ton profil, chaque analyse tiendra compte de tes caractéristiques personnelles.',
    tips: [
      { icon: '🌟', title: 'Type de peau', desc: 'Grasse, sèche, mixte — l\'IA en tient compte lors de l\'évaluation des ingrédients et donne des recommandations pertinentes.' },
      { icon: '🌺', title: 'Sensibilité et réactions', desc: 'Indique si tu as des intolérances aux parfums, à l\'alcool ou aux huiles essentielles — et l\'IA mettra en évidence ces ingrédients dans l\'analyse.' },
      { icon: '🌧', title: 'Conditions cutanées', desc: 'Éruptions cutanées, pores dilatés, points noirs, teint irrégulier : veuillez décrire ces problèmes dans la section « Paramètres » afin que nous puissions en tenir compte dans notre analyse.' },
      { icon: '☘️', title: 'Type de cheveux et cuir chevelu', desc: 'Pour l\'analyse des shampoings, masques et produits capillaires — précise ton type de cheveux, l\'état de ton cuir chevelu et les problèmes.' },
    ],

    tipsLabel: 'Conseils',
    tipsTitle: 'Comment obtenir les meilleurs',
    tipsTitleEm: 'résultats',
    photoTips: [
      { icon: '📸', title: 'Photographie dans une bonne lumière', desc: 'Évite les ombres et les reflets sur l\'emballage. Une lumière naturelle uniforme ou un fond blanc fonctionne le mieux.' },
      { icon: '🔍', title: 'Photographie la liste INCI', desc: 'Cherche la section intitulée « Ingredients » ou « INCI » sur l\'emballage. Si elle n\'est pas là, une photo du produit entier fonctionne aussi.' },
      { icon: '💾', title: 'Sauvegarde les résultats (connecte-toi)', desc: 'Les utilisateurs enregistrés stockent jusqu\'à 20 scans récents. Pratique pour revenir aux analyses de produits déjà achetés.' },
      { icon: '🔗', title: 'Partage les résultats', desc: 'Appuie sur « Partager » pour obtenir un lien unique vers l\'analyse que tu peux envoyer à une amie ou sauvegarder. Le lien s\'ouvre sans connexion.' },
    ],

    faqLabel: 'Questions fréquentes',
    faqTitle: 'Questions',
    faqTitleEm: 'fréquemment posées',
    faqs: [
      { q: 'Mes photos sont-elles stockées ?', a: 'Non. Les images sont utilisées exclusivement pour l\'analyse et ne sont pas stockées sur les serveurs. Seul le résultat de l\'analyse est sauvegardé — et uniquement si tu es connecté·e.' },
      { q: 'Quelle est la précision de l\'analyse ?', a: 'L\'IA utilise les données de EWG Skin Deep, CosDNA, PubChem, INCI Decoder et EU CosIng. Si des données sur un ingrédient spécifique sont indisponibles, cela est clairement indiqué.' },
      { q: 'Est-ce un conseil médical ?', a: 'Non. GlowKey AI fournit des informations à des fins éducatives. Consulte toujours un dermatologue avant de modifier ta routine de soin.' },
      { q: 'Dois-je m\'inscrire ?', a: 'Non — tu peux analyser des produits sans compte. La connexion Google débloque l\'historique, un profil personnel et la possibilité de partager les résultats.' },
      { q: 'Que faire si l\'IA ne reconnaît pas le produit ?', a: 'Essaie de prendre une photo plus nette spécifiquement de la liste INCI, en t\'assurant que le texte est bien visible et non obscurci par des ombres.' },
      { q: 'Puis-je installer l\'app sur mon téléphone ?', a: 'Oui. GlowKey AI est une Progressive Web App (PWA). Dans le navigateur de ton téléphone, appuie sur « Ajouter à l\'écran d\'accueil ».' },
    ],

    disclaimer: 'GlowKey AI est un outil informatif. L\'analyse est créée par intelligence artificielle et peut contenir des erreurs ou des interprétations incomplètes. Les résultats ne constituent pas un avis médical.',
  },

  it: {
    heroEyebrow: 'GlowKey AI — Guida utente',
    heroTitle: 'Sappi cosa ti',
    heroTitleEm: 'applichi',
    heroSubtitle: 'L\'IA legge gli ingredienti cosmetici e spiega ognuno nella tua lingua',

    introLabel: 'Introduzione',
    introTitle: 'Le formule cosmetiche non sono più un',
    introTitleEm: 'mistero',
    introQuote: '"Ti sei mai chiesto cosa significano Dimetilcone, Fenossietanolo o Idrossitoluene butilato su un\'etichetta? GlowKey AI lo decodifica in pochi secondi." — Team GlowKey AI',
    introBody: 'GlowKey AI è un analizzatore intelligente di ingredienti cosmetici. Fotografa una crema, un siero, uno shampoo o qualsiasi altro prodotto, e l\'app ti dice immediatamente quali componenti sono sicuri, cosa richiede cautela, come usare correttamente il prodotto e quali alternative esistono sul mercato.',

    stepsLabel: 'Istruzioni',
    stepsTitle: 'Quattro passi per un\'analisi',
    stepsTitleEm: 'completa',
    steps: [
      { num: '01', title: 'Carica una foto', desc: 'Fotografa il retro della confezione con l\'elenco degli ingredienti (INCI) o l\'intero prodotto. Qualsiasi immagine funziona. Più nitida è la foto, più precisa è l\'analisi.' },
      { num: '02', title: 'Dai il consenso e premi "Analizza"', desc: 'Spunta la casella di consenso e premi il pulsante. La tua foto viene usata solo per questa analisi e non viene archiviata sui server a tua insaputa.' },
      { num: '03', title: 'Ricevi l\'analisi completa', desc: 'L\'IA legge la formula, identifica ogni ingrediente tramite database internazionali (EWG, CosDNA, EU CosIng) e restituisce un report strutturato con valutazione della sicurezza, guida all\'uso, avvertenze e alternative.' },
      { num: '04', title: 'Fai domande di approfondimento', desc: 'Dopo l\'analisi appare una chat "Chiedi all\'IA". Puoi fare fino a 10 domande sul prodotto — per esempio, "è compatibile con il retinolo?" o "è adatto alle pelli sensibili?"' },
    ],

    reportLabel: 'Cosa ottieni',
    reportTitle: 'Sezioni del',
    reportTitleEm: 'report',
    reportIntro: 'Ogni analisi contiene nove sezioni espandibili. Tocca una qualsiasi per vedere i dettagli.',
    features: [
      { icon: '🛡️', title: 'Analisi generale', desc: 'Un verdetto conciso sulla formula: cos\'è, com\'è composta e a cosa prestare attenzione prima di tutto.' },
      { icon: '🌿', title: 'Ingredienti', desc: 'Elenco completo dei componenti con descrizioni e valutazione della sicurezza codificata a colori. Nessuna abbreviazione — solo linguaggio chiaro.' },
      { icon: '📋', title: 'Utilizzo', desc: 'Guida passo passo: per chi è adatto, come applicare, quanto, con quale frequenza e dove si inserisce nella routine di cura.' },
      { icon: '✨', title: 'Benefici', desc: 'Cosa fa davvero questo prodotto per la tua pelle o i tuoi capelli — collegato a ingredienti attivi specifici.' },
      { icon: '⚠️', title: 'Effetti collaterali', desc: 'Possibili reazioni per categoria: irritazione, allergie, effetti dall\'uso prolungato.' },
      { icon: '⚡', title: 'Compatibilità', desc: 'Quali attivi e prodotti si combinano bene e cosa non dovrebbe assolutamente essere usato contemporaneamente.' },
      { icon: '🕐', title: 'Durata di conservazione', desc: 'Come e dove conservare il prodotto per mantenerne l\'efficacia. Periodo dopo l\'apertura (PAO).' },
      { icon: '🔄', title: 'Alternative', desc: '3–5 prodotti reali con una formula simile — nel caso in cui qualcosa nella composizione non ti abbia convinto o il prodotto non sia disponibile.' },
      { icon: '📝', title: 'Nota personale', desc: 'Analisi basata sulle caratteristiche di pelle e capelli specificate. Il sistema tiene conto delle preferenze individuali nella generazione dei consigli.' },
    ],

    badgesLabel: 'Marcatori di colore',
    badgesTitle: 'Cosa significano i badge di',
    badgesTitleEm: 'sicurezza',
    badgesIntro: 'Ogni ingrediente riceve una di tre valutazioni basate su dati di database cosmetici internazionali.',
    badges: [
      { dot: '🟢', label: 'Sicuro', desc: 'L\'ingrediente è ben studiato, ampiamente utilizzato e non solleva preoccupazioni secondo i dati scientifici attuali. Adatto alla maggior parte dei tipi di pelle.' },
      { dot: '🟡', label: 'Attenzione', desc: 'Il componente può causare reazioni nelle persone con pelle sensibile, allergie o condizioni specifiche. Si raccomanda un test cutaneo prima dell\'uso.' },
      { dot: '🔴', label: 'Rischio elevato', desc: 'L\'ingrediente ha rischi documentati: attività ormonale, alto potenziale allergenico, divieti in certi paesi o risultati di ricerca negativi.' },
    ],

    profileLabel: 'Personalizzazione',
    profileTitle: 'Analisi pensata per',
    profileTitleEm: 'la tua pelle',
    profileIntro: 'Se ti registri e compili il tuo profilo, ogni analisi terrà conto delle tue caratteristiche personali.',
    tips: [
      { icon: '🌟', title: 'Tipo di pelle', desc: 'Grassa, secca, mista — l\'IA lo considera nella valutazione degli ingredienti e fornisce raccomandazioni pertinenti.' },
      { icon: '🌺', title: 'Sensibilità e reazioni', desc: 'Indica se hai intolleranze a fragranze, alcol o oli essenziali — e l\'IA evidenzierà quegli ingredienti nell\'analisi.' },
      { icon: '🌧', title: 'Condizioni della pelle', desc: 'Eruzioni cutanee, pori dilatati, punti neri, incarnato non uniforme: ti preghiamo di descrivere questi problemi nella sezione «Impostazioni», in modo che possiamo tenerne conto nella nostra analisi.' },
      { icon: '☘️', title: 'Tipo di capelli e cuoio capelluto', desc: 'Per l\'analisi di shampoo, maschere e prodotti per capelli — specifica il tipo di capelli, le condizioni del cuoio capelluto e i problemi.' },
    ],

    tipsLabel: 'Consigli',
    tipsTitle: 'Come ottenere i migliori',
    tipsTitleEm: 'risultati',
    photoTips: [
      { icon: '📸', title: 'Fotografa con buona illuminazione', desc: 'Evita ombre e riflessi sulla confezione. La luce naturale uniforme o uno sfondo bianco funzionano meglio.' },
      { icon: '🔍', title: 'Fotografa la lista INCI', desc: 'Cerca la sezione etichettata "Ingredients" o "INCI" sulla confezione. Se non c\'è, funziona anche una foto dell\'intero prodotto.' },
      { icon: '💾', title: 'Salva i risultati (accedi)', desc: 'Gli utenti registrati conservano fino a 20 scansioni recenti. Utile per tornare alle analisi di prodotti già acquistati.' },
      { icon: '🔗', title: 'Condividi i risultati', desc: 'Tocca "Condividi" per ottenere un link unico all\'analisi che puoi inviare a un\'amica o salvare per te. Il link si apre senza login.' },
    ],

    faqLabel: 'Domande frequenti',
    faqTitle: 'Domande',
    faqTitleEm: 'frequenti',
    faqs: [
      { q: 'Le mie foto vengono conservate?', a: 'No. Le immagini sono usate esclusivamente per l\'analisi e non vengono archiviate sui server. Solo il risultato dell\'analisi viene salvato — e solo se sei connesso·a.' },
      { q: 'Quanto è accurata l\'analisi?', a: 'L\'IA utilizza dati da EWG Skin Deep, CosDNA, PubChem, INCI Decoder e EU CosIng. Se mancano dati su un ingrediente specifico, viene chiaramente indicato.' },
      { q: 'È un consiglio medico?', a: 'No. GlowKey AI fornisce informazioni a scopo educativo. Consulta sempre un dermatologo prima di modificare la tua routine di cura.' },
      { q: 'Ho bisogno di registrarmi?', a: 'No — puoi analizzare prodotti senza account. Il login con Google sblocca la cronologia, un profilo personale e la possibilità di condividere i risultati.' },
      { q: 'Cosa fare se l\'IA non riconosce il prodotto?', a: 'Prova a scattare una foto più nitida specificamente della lista INCI, assicurandoti che il testo sia ben visibile e non oscurato da ombre.' },
      { q: 'Posso installare l\'app sul telefono?', a: 'Sì. GlowKey AI è una Progressive Web App (PWA). Nel browser del tuo telefono, tocca "Aggiungi alla schermata Home".' },
    ],

    disclaimer: 'GlowKey AI è uno strumento informativo. L\'analisi è creata dall\'intelligenza artificiale e può contenere errori o interpretazioni incomplete. I risultati non costituiscono un consiglio medico.',
  },

  tr: {
    heroEyebrow: 'GlowKey AI — Kullanım Kılavuzu',
    heroTitle: 'Ne sürdüğünü',
    heroTitleEm: 'bil',
    heroSubtitle: 'Yapay zeka kozmetik içerikleri okur ve her birini kendi dilinde açıklar',

    introLabel: 'Giriş',
    introTitle: 'Kozmetik formüller artık bir',
    introTitleEm: 'sır değil',
    introQuote: '"Bir etiketteki Dimetikon, Fenoksietanol veya Bütillenmiş Hidroksitoluen\'in ne anlama geldiğini hiç merak ettiniz mi? GlowKey AI saniyeler içinde çözer." — GlowKey AI Ekibi',
    introBody: 'GlowKey AI akıllı bir kozmetik içerik analizörüdür. Bir krem, serum, şampuan veya başka bir ürünü fotoğraflayın; uygulama hangi bileşenlerin güvenli olduğunu, nelerin dikkat gerektirdiğini, ürünü nasıl doğru kullanacağınızı ve pazardaki alternatifleri anında söyler.',

    stepsLabel: 'Nasıl çalışır',
    stepsTitle: 'Tam analize',
    stepsTitleEm: 'dört adım',
    steps: [
      { num: '01', title: 'Fotoğraf yükle', desc: 'İçerik listesi (INCI) bulunan ambalajın arka yüzünü veya ürünün tamamını fotoğraflayın. Herhangi bir görüntü işe yarar. Fotoğraf ne kadar netse analiz o kadar doğru olur.' },
      { num: '02', title: 'Onay ver ve "Analiz Et"e bas', desc: 'Onay kutusunu işaretleyin ve düğmeye basın. Fotoğrafınız yalnızca bu analiz için kullanılır ve bilginiz olmadan sunucularda depolanmaz.' },
      { num: '03', title: 'Tam sonucu al', desc: 'Yapay zeka formülü okur, her içeriği uluslararası veritabanlarına (EWG, CosDNA, EU CosIng) göre tanımlar ve güvenlik değerlendirmesi, kullanım kılavuzu, uyarılar ve alternatifler içeren yapılandırılmış bir rapor döndürür.' },
      { num: '04', title: 'Takip soruları sor', desc: 'Analizden sonra bir "YZ\'ye Sor" sohbeti belirir. Ürün hakkında 10\'a kadar soru sorabilirsiniz — örneğin "retinol ile uyumlu mu?" veya "hassas cilt için uygun mu?"' },
    ],

    reportLabel: 'Ne elde edersiniz',
    reportTitle: 'Rapor',
    reportTitleEm: 'bölümleri',
    reportIntro: 'Her analiz dokuz katlanabilir bölüm içerir. Ayrıntıları görmek için herhangi birine dokunun.',
    features: [
      { icon: '🛡️', title: 'Genel Analiz', desc: 'Formül hakkında kısa bir karar: ne olduğu, nasıl bir formülü olduğu ve önce neye dikkat edilmesi gerektiği.' },
      { icon: '🌿', title: 'İçerikler', desc: 'Açıklamalar ve renk kodlu güvenlik değerlendirmesiyle tüm içerik listesi. Kısaltma yok — sadece anlaşılır dil.' },
      { icon: '📋', title: 'Kullanım', desc: 'Adım adım kılavuz: kime uygun, nasıl uygulanır, ne kadar, ne sıklıkla ve cilt bakım rutinindeki yeri.' },
      { icon: '✨', title: 'Faydalar', desc: 'Bu ürünün cildiniz veya saçınız için gerçekte ne yaptığı — belirli aktif içeriklere bağlı olarak.' },
      { icon: '⚠️', title: 'Yan Etkiler', desc: 'Kategoriye göre olası reaksiyonlar: tahriş, alerjiler, uzun süreli kullanım etkileri.' },
      { icon: '⚡', title: 'Uyumluluk', desc: 'Hangi aktifler ve ürünler birlikte kullanılabilir, hangilerinin kesinlikle aynı anda kullanılmaması gerektiği.' },
      { icon: '🕐', title: 'Raf Ömrü', desc: 'Etkinliğini korumak için ürünün nasıl ve nerede saklanacağı. Açıldıktan sonra kullanım süresi (PAO).' },
      { icon: '🔄', title: 'Alternatifler', desc: 'Benzer formüle sahip 3–5 gerçek ürün — bileşimdeki bir şey sizi tatmin etmediyse veya ürün mevcut değilse.' },
      { icon: '📝', title: 'Kişisel Not', desc: 'Belirtilen cilt ve saç özelliklerine dayalı analiz. Sistem, öneriler oluştururken bireysel tercihleri dikkate alır.' },
    ],

    badgesLabel: 'Renk işaretçileri',
    badgesTitle: 'Güvenlik rozetleri ne',
    badgesTitleEm: 'anlama gelir',
    badgesIntro: 'Her içerik, uluslararası kozmetik veritabanlarından gelen verilere dayalı üç değerlendirmeden birini alır.',
    badges: [
      { dot: '🟢', label: 'Güvenli', desc: 'İçerik iyi incelenmiş, yaygın olarak kullanılmakta ve mevcut bilimsel verilere göre endişe yaratmamaktadır. Çoğu cilt tipi için uygundur.' },
      { dot: '🟡', label: 'Dikkat', desc: 'Bileşen, hassas ciltli, alerjisi olan veya belirli durumları olan kişilerde reaksiyona yol açabilir. Kullanmadan önce yama testi yapılması önerilir.' },
      { dot: '🔴', label: 'Yüksek Risk', desc: 'İçeriğin belgelenmiş riskleri vardır: hormonal aktivite, yüksek alerjenik potansiyel, bazı ülkelerde yasaklar veya olumsuz araştırma bulguları.' },
    ],

    profileLabel: 'Kişiselleştirme',
    profileTitle: 'Cildinize özel',
    profileTitleEm: 'analiz',
    profileIntro: 'Kaydolur ve profilinizi doldurursanız her analiz kişisel özelliklerinizi dikkate alır.',
    tips: [
      { icon: '🌟', title: 'Cilt Tipi', desc: 'Yağlı, kuru, karma — YZ içerikleri değerlendirirken bunu dikkate alır ve ilgili öneriler sunar.' },
      { icon: '🌺', title: 'Hassasiyet ve Reaksiyonlar', desc: 'Parfüm, alkol veya uçucu yağlara karşı tahammülsüzlüğünüz varsa belirtin — YZ bu içerikleri analizde mutlaka vurgular.' },
      { icon: '🌧', title: 'Cilt Durumları', desc: 'Ciltte kızarıklıklar, genişlemiş gözenekler, sivilceler, düzensiz cilt tonu — lütfen bu sorunları «Ayarlar» bölümünde belirtin, böylece analizimizde bunları dikkate alabilelim.' },
      { icon: '☘️', title: 'Saç ve Kafa Derisi Tipi', desc: 'Şampuan, maske ve saç bakım ürünleri analizi için saç tipinizi, kafa derisi durumunuzu ve sorunlarınızı belirtin.' },
    ],

    tipsLabel: 'İpuçları',
    tipsTitle: 'En iyi sonuçları nasıl',
    tipsTitleEm: 'elde edersiniz',
    photoTips: [
      { icon: '📸', title: 'İyi ışıkta fotoğraflayın', desc: 'Ambalajdaki gölgelerden ve parlak yansımalardan kaçının. Eşit doğal ışık veya beyaz arka plan en iyi sonucu verir.' },
      { icon: '🔍', title: 'INCI listesini fotoğraflayın', desc: 'Ambalajda "Ingredients" veya "INCI" etiketli bölümü arayın. Yoksa ürünün tamamının fotoğrafı da işe yarar.' },
      { icon: '💾', title: 'Sonuçları kaydedin (giriş yapın)', desc: 'Kayıtlı kullanıcılar son 20 taramayı saklar. Satın alınan ürünlerin analizlerine yeniden tarama yapmadan dönmek için kullanışlı.' },
      { icon: '🔗', title: 'Sonuçları paylaşın', desc: '"Paylaş"a dokunarak bir arkadaşınıza gönderebileceğiniz veya kendiniz için saklayabileceğiniz benzersiz bir analiz bağlantısı alın. Bağlantı giriş yapmadan açılır.' },
    ],

    faqLabel: 'Sık Sorulan Sorular',
    faqTitle: 'Sık sorulan',
    faqTitleEm: 'sorular',
    faqs: [
      { q: 'Fotoğraflarım saklanıyor mu?', a: 'Hayır. Görüntüler yalnızca analiz için kullanılır ve sunucularda saklanmaz. Yalnızca analiz sonucu veritabanına kaydedilir — ve yalnızca giriş yapmışsanız.' },
      { q: 'Analiz ne kadar doğru?', a: 'YZ, EWG Skin Deep, CosDNA, PubChem, INCI Decoder ve EU CosIng verilerini kullanır. Belirli bir içerik hakkında veri yoksa bu açıkça belirtilir.' },
      { q: 'Bu tıbbi tavsiye mi?', a: 'Hayır. GlowKey AI bilgileri eğitim amaçlı sunar. Bakım rutininizi değiştirmeden önce her zaman bir dermatologa danışın.' },
      { q: 'Kayıt olmam gerekiyor mu?', a: 'Hayır — ürünleri hesap olmadan analiz edebilirsiniz. Google girişi tarama geçmişini, kişisel profili ve sonuçları paylaşma özelliğini açar.' },
      { q: 'YZ ürünü tanımazsa ne yapmalıyım?', a: 'Özellikle INCI listesinin daha net bir fotoğrafını çekmeyi deneyin; metnin açıkça görüldüğünden ve gölgeyle örtülmediğinden emin olun.' },
      { q: 'Uygulamayı telefonuma yükleyebilir miyim?', a: 'Evet. GlowKey AI bir Progressive Web App\'tir (PWA). Telefonunuzun tarayıcısında "Ana ekrana ekle"ye dokunun.' },
    ],

    disclaimer: 'GlowKey AI bir bilgi aracıdır. Analiz yapay zeka tarafından oluşturulur ve hatalar veya eksik yorumlar içerebilir. Sonuçlar tıbbi tavsiye niteliği taşımaz.',
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
          <div className="pt-8">
            <div className="bg-[#B89F7A]/5 border border-[#B89F7A]/20 rounded-sm p-4 text-xs text-[#4A4A4A] leading-relaxed">
              <strong className="text-[#2C3E50] block mb-1">⚠️ Disclaimer</strong>
              {c.disclaimer}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
