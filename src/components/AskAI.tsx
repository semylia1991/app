import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { t, Language } from '../i18n';
import { AnalysisResult } from '../services/ai';
 
interface Props {
  lang: Language;
  context: AnalysisResult;
}
 
function buildAskPrompt(question: string, context: AnalysisResult, language: string): string {
  const inci = context.ingredients.map(i => i.name).join(', ');
  const lines = [
    `You are a cosmetics guidance and ingredient analysis system. Respond ONLY in ${language}.`,
    '',
    'Your task: provide clear, informative answers about any cosmetics-related question, including product composition (INCI).',
    '',
    `Question: ${question}`,
    `Product composition (INCI): ${inci}`,
    `Product: ${context.productName} by ${context.brand} (${context.productType})`,
    '',
    'RULES:',
    '- Do not give medical advice.',
    '- Avoid words like treats, prescribe, contraindicated, suitable or unsuitable.',
    '- Use neutral phrasing: worth noting, may cause, is sometimes associated with.',
    '- Explain reasoning using specific ingredients from the INCI list.',
    '- Write simply and clearly.',
    '',
    `ANSWER FORMAT (translate all headings to ${language}):`,
    '',
    '**Brief summary** (1-2 sentences)',
    '',
    '**What to look out for:**',
    '- [ingredient] - [why it matters]',
    '',
    '**Potentially beneficial components:**',
    '- [ingredient] - [function or effect]',
    '',
    '**General comment:** (neutral overview, no recommendations)',
    '',
    '---',
    '*Automated AI analysis. Not medical advice.*',
  ];
  return lines.join('\n');
}
 
export function AskAI({ lang, context }: Props) {
  const [question, setQuestion] = useState('');
  const [chat, setChat] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [questionsCount, setCount] = useState(0);
  const MAX_QUESTIONS = 5;
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading || questionsCount >= MAX_QUESTIONS) return;
 
    const q = question;
    setQuestion('');
    setChat(prev => [...prev, { role: 'user', text: q }]);
    setIsLoading(true);
    setCount(prev => prev + 1);
 
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask',
          question: buildAskPrompt(q, context, t[lang].personalAnalysisLang),
          context: {},
          language: t[lang].personalAnalysisLang,
        }),
      });
      const data = await res.json();
      setChat(prev => [...prev, { role: 'ai', text: data.answer ?? t[lang].error }]);
    } catch {
      setChat(prev => [...prev, { role: 'ai', text: t[lang].error }]);
    } finally {
      setIsLoading(false);
    }
  };
 
  return (
    <div className="mt-8 border border-[#D4C3A3] rounded-sm bg-white/50 p-4 shadow-sm">
      <div className="flex justify-between items-center mb-4 border-b border-[#D4C3A3]/30 pb-2">
        <h3 className="font-serif text-xl text-[#2C3E50] flex items-center gap-2">
          <span className="text-[#B89F7A]">📜</span> {t[lang].askAi}
        </h3>
        <span className="text-[10px] uppercase tracking-widest text-[#B89F7A]">
          {questionsCount} / {MAX_QUESTIONS} {t[lang].questions}
        </span>
      </div>
 
      <div className="space-y-4 mb-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
        {chat.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-sm text-sm ${
              msg.role === 'user'
                ? 'bg-[#B89F7A]/10 text-[#2C3E50] border border-[#B89F7A]/20'
                : 'bg-[#FDFBF7] text-[#4A4A4A] border border-[#D4C3A3]/50 shadow-sm'
            }`}>
              {msg.role === 'ai' ? (
                <div className="prose prose-sm prose-stone max-w-none
                  [&_strong]:font-semibold [&_strong]:text-[#2C3E50]
                  [&_p]:text-xs [&_p]:text-[#4A4A4A] [&_p]:leading-relaxed [&_p]:mb-1
                  [&_ul]:pl-3 [&_ul]:mt-1 [&_ul]:space-y-0.5
                  [&_li]:text-xs [&_li]:text-[#4A4A4A]
                  [&_hr]:border-[#D4C3A3]/50 [&_hr]:my-2
                  [&_em]:text-[9px] [&_em]:text-[#B89F7A] [&_em]:not-italic">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
 
        {isLoading && (
          <div className="flex justify-start">
            <div className="p-3 rounded-sm bg-[#FDFBF7] border border-[#D4C3A3]/50 text-[#B89F7A] flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm italic">Thinking...</span>
            </div>
          </div>
        )}
 
        {questionsCount >= MAX_QUESTIONS && !isLoading && (
          <div className="text-center p-2 bg-[#B89F7A]/5 border border-dashed border-[#B89F7A]/30 rounded-sm">
            <p className="text-[10px] uppercase tracking-tighter text-[#B89F7A]">
              {t[lang].limitReached}
            </p>
          </div>
        )}
      </div>
 
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder={questionsCount >= MAX_QUESTIONS ? t[lang].limitReached : t[lang].askAiPlaceholder}
          className="w-full pl-4 pr-12 py-3 bg-white border border-[#D4C3A3] rounded-sm focus:outline-none focus:ring-1 focus:ring-[#B89F7A] text-sm text-[#2C3E50] placeholder-[#B89F7A]/50 transition-shadow disabled:bg-gray-50"
          disabled={isLoading || questionsCount >= MAX_QUESTIONS}
        />
        <button
          type="submit"
          disabled={!question.trim() || isLoading || questionsCount >= MAX_QUESTIONS}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#B89F7A] hover:text-[#2C3E50] disabled:opacity-50 transition-colors"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
