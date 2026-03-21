import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
 
const QUOTES = [
  { author: "Socrates", text: "«Познай самого себя.»" },
  { author: "Socrates", text: "«Красота — это гармония.»" },
  { author: "Friedrich Nietzsche", text: "«Тот, кто имеет зачем жить, выдержит почти любое как.»" },
  { author: "Friedrich Nietzsche", text: "«Красота — обещание счастья.»" },
  { author: "Albert Einstein", text: "«Воображение важнее знания.»" },
  { author: "Albert Einstein", text: "«Всё красивое — просто.»" },
  { author: "Albert Einstein", text: "«Логика приведёт тебя от А к Б. Воображение — куда угодно.»" },
  { author: "Albert Einstein", text: "«Стремись к простоте, но не к простоте мысли.»" },
  { author: "Marcus Aurelius", text: "«Наша жизнь — то, что мы думаем о ней.»" },
  { author: "Marcus Aurelius", text: "«Красота характера важнее внешности.»" },
  { author: "Marcus Aurelius", text: "«Ты становишься тем, о чём думаешь.»" },
  { author: "Confucius", text: "«Не останавливайся.»" },
  { author: "Confucius", text: "«Всё имеет красоту, но не каждый её видит.»" },
  { author: "Confucius", text: "«Мудрость — в умении отличать важное.»" },
  { author: "Confucius", text: "«Путь в тысячу миль начинается с одного шага.»" },
  { author: "Seneca", text: "«Страдание чаще в мыслях, чем в реальности.»" },
  { author: "Seneca", text: "«Истинная красота — в душе.»" },
  { author: "Seneca", text: "«Жизнь длинна, если её использовать разумно.»" },
  { author: "Epictetus", text: "«Контролируй реакцию, не события.»" },
  { author: "Epictetus", text: "«Украшай разум, а не тело.»" },
  { author: "Plato", text: "«Начало — главное.»" },
  { author: "Plato", text: "«Красота — сияние истины.»" },
  { author: "Plato", text: "«Добродетель — это знание.»" },
  { author: "Aristotle", text: "«Счастье — в действиях.»" },
  { author: "Aristotle", text: "«Красота — дар природы.»" },
  { author: "Aristotle", text: "«Мы есть то, что мы постоянно делаем.»" },
  { author: "Immanuel Kant", text: "«Думай самостоятельно.»" },
  { author: "Immanuel Kant", text: "«Красота — это удовольствие без интереса.»" },
  { author: "Blaise Pascal", text: "«Человек не умеет быть один.»" },
  { author: "Blaise Pascal", text: "«Сердце имеет причины, которых разум не знает.»" },
  { author: "Jean-Paul Sartre", text: "«Свобода — ответственность.»" },
  { author: "Albert Camus", text: "«Смысл создаётся.»" },
  { author: "Albert Camus", text: "«В разгар зимы я понял, что внутри меня лето.»" },
  { author: "Carl Jung", text: "«Смотри внутрь.»" },
  { author: "Carl Jung", text: "«Красота — отражение внутреннего.»" },
  { author: "Erich Fromm", text: "«Любовь — навык.»" },
  { author: "Erich Fromm", text: "«Красота — результат любви.»" },
  { author: "Viktor Frankl", text: "«Смысл находят.»" },
  { author: "Leo Tolstoy", text: "«Где любовь, там жизнь.»" },
  { author: "Leo Tolstoy", text: "«Красота — в простоте.»" },
  { author: "Leo Tolstoy", text: "«Счастье — в простых вещах.»" },
  { author: "Leo Tolstoy", text: "«Семья — это первая школа любви и терпения.»" },
  { author: "Fyodor Dostoevsky", text: "«Красота спасёт мир.»" },
  { author: "Fyodor Dostoevsky", text: "«Страдание — источник сознания.»" },
  { author: "Antoine de Saint-Exupéry", text: "«Главное невидимо.»" },
  { author: "Antoine de Saint-Exupéry", text: "«Зорко одно лишь сердце.»" },
  { author: "Oscar Wilde", text: "«Будь собой.»" },
  { author: "Oscar Wilde", text: "«Красота — форма гения.»" },
  { author: "Oscar Wilde", text: "«Опыт — имя ошибок.»" },
  { author: "Oscar Wilde", text: "«Любить себя — начало романа длиною в жизнь.»" },
  { author: "Mark Twain", text: "«Начни.»" },
  { author: "Mark Twain", text: "«Правда сильнее вымысла.»" },
  { author: "Ernest Hemingway", text: "«Сломать можно, победить — нет.»" },
  { author: "Ernest Hemingway", text: "«Мужество — это достоинство под давлением.»" },
  { author: "George Orwell", text: "«Правда — это свобода.»" },
  { author: "Franz Kafka", text: "«Вопрос важнее ответа.»" },
  { author: "Gabriel Garcia Marquez", text: "«Жизнь — это память.»" },
  { author: "Milan Kundera", text: "«Память против забвения.»" },
  { author: "Johann Wolfgang von Goethe", text: "«Действуй.»" },
  { author: "Johann Wolfgang von Goethe", text: "«Смелость содержит в себе гений.»" },
  { author: "Johann Wolfgang von Goethe", text: "«Любовь делает невозможное возможным.»" },
  { author: "Victor Hugo", text: "«После ночи — рассвет.»" },
  { author: "Victor Hugo", text: "«Красота — это свет в сердце.»" },
  { author: "Victor Hugo", text: "«Свобода начинается там, где заканчивается страх.»" },
  { author: "William Shakespeare", text: "«Любовь слепа.»" },
  { author: "Jane Austen", text: "«Любовь требует времени.»" },
  { author: "Rumi", text: "«Ты ищешь то, что ищет тебя.»" },
  { author: "Rumi", text: "«Красота — это свет души.»" },
  { author: "Rumi", text: "«Где рана — там свет входит.»" },
  { author: "Khalil Gibran", text: "«Любовь свободна.»" },
  { author: "Khalil Gibran", text: "«Красота — вечность, смотрящая в зеркало.»" },
  { author: "Paulo Coelho", text: "«Желание ведёт.»" },
  { author: "Paulo Coelho", text: "«Красота — это путь сердца.»" },
  { author: "Haruki Murakami", text: "«Боль неизбежна. Страдание — выбор.»" },
  { author: "Haruki Murakami", text: "«Красота — в деталях.»" },
  { author: "Coco Chanel", text: "«Меняйся.»" },
  { author: "Coco Chanel", text: "«Красота начинается с решения быть собой.»" },
  { author: "Coco Chanel", text: "«Чтобы быть незаменимой, нужно меняться. В этом и есть красота.»" },
  { author: "Leonardo da Vinci", text: "«Простота — совершенство.»" },
  { author: "Leonardo da Vinci", text: "«Учись видеть.»" },
  { author: "Michelangelo", text: "«Красота уже есть в камне.»" },
  { author: "Vincent van Gogh", text: "«Красота везде.»" },
  { author: "Claude Monet", text: "«Я рисую то, что чувствую.»" },
  { author: "Pablo Picasso", text: "«Воображай.»" },
  { author: "Salvador Dali", text: "«Совершенство не существует — есть только стиль.»" },
  { author: "Audrey Hepburn", text: "«Красота внутри.»" },
  { author: "Audrey Hepburn", text: "«Красота женщины — в её глазах.»" },
  { author: "Audrey Hepburn", text: "«Никогда не сдерживай доброту; всегда поддерживай других.»" },
  { author: "Marilyn Monroe", text: "«Будь уникальным.»" },
  { author: "Marilyn Monroe", text: "«Истинная красота — в индивидуальности.»" },
  { author: "Sophia Loren", text: "«Красота — это уверенность.»" },
  { author: "Angelina Jolie", text: "«Красота — это быть собой.»" },
  { author: "Emma Watson", text: "«Красота — это принятие себя.»" },
  { author: "Keanu Reeves", text: "«Красота — в простых вещах.»" },
  { author: "Brad Pitt", text: "«Красота — это энергия.»" },
  { author: "Johnny Depp", text: "«Странность — часть красоты.»" },
  { author: "Taylor Swift", text: "«Красота — это быть настоящим.»" },
  { author: "Rihanna", text: "«Красота начинается с уверенности.»" },
  { author: "Winston Churchill", text: "«Не сдавайся.»" },
  { author: "Winston Churchill", text: "«Никогда не сдавайся. Никогда. Никогда. Никогда.»" },
  { author: "Abraham Lincoln", text: "«Иди вперёд.»" },
  { author: "Abraham Lincoln", text: "«Дом, полный любви, сильнее любого царства.»" },
  { author: "Benjamin Franklin", text: "«Учись.»" },
  { author: "Benjamin Franklin", text: "«Инвестиции в знания дают лучший процент.»" },
  { author: "Thomas Edison", text: "«Работай.»" },
  { author: "Thomas Edison", text: "«Гений — это 1% вдохновения и 99% труда.»" },
  { author: "Steve Jobs", text: "«Люби дело.»" },
  { author: "Steve Jobs", text: "«Оставайся голодным. Оставайся безрассудным.»" },
  { author: "Steve Jobs", text: "«Иди за своим сердцем.»" },
  { author: "Elon Musk", text: "«Делай важное.»" },
  { author: "Dalai Lama", text: "«Управляй умом.»" },
  { author: "Dalai Lama", text: "«Счастье — это состояние ума.»" },
  { author: "Dalai Lama", text: "«Счастье не приходит само — мы создаем его действиями.»" },
  { author: "Bruce Lee", text: "«Будь гибким.»" },
  { author: "Bruce Lee", text: "«Будь как вода.»" },
  { author: "Bruce Lee", text: "«Простота — ключ к мастерству.»" },
  { author: "Sun Tzu", text: "«Готовься.»" },
  { author: "Alan Watts", text: "«Отпусти контроль.»" },
  { author: "Heraclitus", text: "«Скрытая гармония сильнее явной.»" },
  { author: "Heraclitus", text: "«Всё течёт, всё меняется.»" },
  { author: "Pythagoras", text: "«Гармония — основа красоты.»" },
  { author: "Voltaire", text: "«Красота радует глаз.»" },
  { author: "Voltaire", text: "«Сомнение — начало мудрости.»" },
  { author: "Jean-Jacques Rousseau", text: "«Природа — источник красоты.»" },
  { author: "Blaise Pascal", text: "«Красота — тонкое чувство.»" },
  { author: "Ralph Waldo Emerson", text: "«Красота — в глазах смотрящего.»" },
  { author: "Ralph Waldo Emerson", text: "«То, что внутри тебя, важнее того, что вокруг.»" },
  { author: "Ralph Waldo Emerson", text: "«Любовь — наш истинный смысл.»" },
  { author: "George Bernard Shaw", text: "«Жизнь не в поиске себя, а в создании себя.»" },
  { author: "George Bernard Shaw", text: "«Красота — это сила.»" },
  { author: "Marie Curie", text: "«Нужно понимать, а не бояться.»" },
  { author: "Nikola Tesla", text: "«Интуиция — дар будущего.»" },
  { author: "Carl Sagan", text: "«Мы — способ Вселенной познать себя.»" },
  { author: "Richard Feynman", text: "«Если не можешь объяснить — не понял.»" },
  { author: "Anton Chekhov", text: "«Краткость — сестра таланта.»" },
  { author: "Laozi", text: "«Тот, кто знает — не говорит.»" },
  { author: "Buddha", text: "«Мы — результат наших мыслей.»" },
  { author: "Galileo Galilei", text: "«И всё-таки она вертится.»" },
  { author: "Isaac Newton", text: "«Я стоял на плечах гигантов.»" },
  { author: "Charles Darwin", text: "«Выживает не сильнейший, а наиболее приспособленный.»" },
  { author: "Stephen Hawking", text: "«Пока есть жизнь, есть надежда.»" },
  { author: "Napoleon Bonaparte", text: "«Невозможное — это слово из словаря глупцов.»" },
  { author: "Theodore Roosevelt", text: "«Сравнение — вор радости.»" },
  { author: "John F. Kennedy", text: "«Перемены — закон жизни.»" },
  { author: "Nelson Mandela", text: "«Свобода — это ответственность.»" },
  { author: "Nelson Mandela", text: "«Смелость — это не отсутствие страха, а победа над ним.»" },
  { author: "Nelson Mandela", text: "«Я никогда не проигрываю. Я либо побеждаю, либо учусь.»" },
  { author: "Mahatma Gandhi", text: "«Сила — в мягкости.»" },
  { author: "Mahatma Gandhi", text: "«Стань тем изменением, которое хочешь увидеть в мире.»" },
  { author: "Martin Luther King Jr.", text: "«Тьма не изгоняет тьму.»" },
  { author: "Martin Luther King Jr.", text: "«Держись мечты, даже если вокруг сомнения.»" },
  { author: "Maya Angelou", text: "«Мы поднимаемся, помогая другим подняться.»" },
  { author: "Oprah Winfrey", text: "«Преврати свои раны в мудрость.»" },
  { author: "Oprah Winfrey", text: "«Ставь цели, которые вдохновляют тебя, а не пугают.»" },
  { author: "Walt Disney", text: "«Если можешь мечтать — можешь делать.»" },
  { author: "Eleanor Roosevelt", text: "«Будь смелым и делай то, чего боишься.»" },
  { author: "Helen Keller", text: "«Жизнь — это либо смелое приключение, либо ничего.»" },
  { author: "Helen Keller", text: "«Держись своих мечтаний, они делают тебя живым.»" },
  { author: "J.K. Rowling", text: "«Невозможное возможно, если верить.»" },
  { author: "Michael Jordan", text: "«Я могу принять поражение, но не могу принять отсутствие попытки.»" },
  { author: "Muhammad Ali", text: "«Невозможно — это слово, которое встречается только в словаре дураков.»" },
  { author: "Tony Robbins", text: "«Измени свои мысли — и изменится твоя жизнь.»" },
  { author: "Paulo Coelho", text: "«Когда ты чего-то хочешь, весь мир будет способствовать твоему желанию.»" },
  { author: "John Lennon", text: "«Жизнь — это то, что происходит, пока ты строишь планы.»" },
  { author: "John Lennon", text: "«Всё, что тебе нужно — это любовь.»" },
  { author: "Mother Teresa", text: "«Любовь начинается с улыбки.»" },
  { author: "Mother Teresa", text: "«Семья — это место, где любовь никогда не заканчивается.»" },
  { author: "Hippocrates", text: "«Здоровье — это самое большое богатство.»" },
  { author: "Hippocrates", text: "«Пусть пища будет твоим лекарством, а лекарство — пищей.»" },
  { author: "Mahatma Gandhi", text: "«Здоровье — это не всё, но всё без здоровья — ничто.»" },
  { author: "Benjamin Franklin", text: "«Здоровый разум в здоровом теле — ключ к жизни.»" },
  { author: "Frida Kahlo", text: "«В конце концов, мы можем больше, чем думаем.»" },
  { author: "Charlie Chaplin", text: "«Жизнь — это трагедия вблизи и комедия вдали.»" },
  { author: "Dale Carnegie", text: "«Действие — главный ключ к успеху.»" },
  { author: "Bill Gates", text: "«Успех — плохой учитель.»" },
  { author: "Jeff Bezos", text: "«Риск — это цена прогресса.»" },
  { author: "Barack Obama", text: "«Настоящая поддержка — это помогать, даже когда никто не видит.»" },
  { author: "Desmond Tutu", text: "«Семья — это место, где начинается любовь и учится сострадание.»" },
];
 
function getRandomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
 
interface Props {
  isVisible: boolean;
}
 
export function LoadingScreen({ isVisible }: Props) {
  const [quote, setQuote] = useState(getRandomQuote);
 
  useEffect(() => {
    if (isVisible) {
      setQuote(getRandomQuote());
    }
  }, [isVisible]);
 
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#FDFBF7]/95 backdrop-blur-sm px-8"
        >
          <div className="w-16 h-[1px] bg-[#D4C3A3] mb-10" />
 
          <motion.div
            key={quote.text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-sm text-center"
          >
            <p className="font-serif text-lg text-[#2C3E50] leading-relaxed mb-4 italic">
              {quote.text}
            </p>
            <p className="text-xs tracking-[0.2em] text-[#B89F7A] uppercase">
              — {quote.author}
            </p>
          </motion.div>
 
          <div className="w-16 h-[1px] bg-[#D4C3A3] mt-10 mb-8" />
 
          <div className="flex items-center gap-2 text-[#B89F7A]">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs tracking-[0.25em] uppercase">Analyzing...</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
