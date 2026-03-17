import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { t, Language } from '../i18n';
import { AnalysisResult, askFollowUpQuestion } from '../services/ai';

interface Props {
  lang: Language;
  context: AnalysisResult;
}

export function AskAI({ lang, context }: Props) {
  const [question, setQuestion] = useState('');
  const [chat, setChat] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [questionsCount, setQuestionsCount] = useState(0);
  const MAX_QUESTIONS = 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading || questionsCount >= MAX_QUESTIONS) return;

    const currentQuestion = question;
    setQuestion('');
    setChat(prev => [...prev, { role: 'user', text: currentQuestion }]);
    setIsLoading(true);
    setQuestionsCount(prev => prev + 1);

    try {
      const answer = await askFollowUpQuestion(currentQuestion, context, lang);
      setChat(prev => [...prev, { role: 'ai', text: answer }]);
    } catch (error) {
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
          <div 
            key={i} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] p-3 rounded-sm text-sm ${
                msg.role === 'user' 
                  ? 'bg-[#B89F7A]/10 text-[#2C3E50] border border-[#B89F7A]/20' 
                  : 'bg-[#FDFBF7] text-[#4A4A4A] border border-[#D4C3A3]/50 shadow-sm'
              }`}
            >
              {msg.text}
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
          onChange={(e) => setQuestion(e.target.value)}
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
