import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import { t, Language } from '../i18n';

interface Props {
  lang: Language;
}

export function SimpleChat({ lang }: Props) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error');
      }

      setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'ai', text: `Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#FDFBF7] regency-border p-6 shadow-xl flex flex-col h-[500px]">
      <div className="text-center mb-4 border-b border-[#D4C3A3] pb-2">
        <h3 className="font-serif text-xl text-[#2C3E50] tracking-widest uppercase flex items-center justify-center gap-2">
          <MessageSquare size={20} className="text-[#B89F7A]" />
          General AI Chat
        </h3>
        <p className="text-[10px] text-[#B89F7A] uppercase tracking-tighter">Secure Server-Side Proxy</p>
      </div>

      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto pr-2 space-y-4 mb-4 custom-scrollbar"
      >
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-[#B89F7A]/50 italic text-sm text-center px-8">
            Start a conversation with our Regency-era AI assistant...
          </div>
        )}
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] p-3 rounded-sm text-sm ${
                msg.role === 'user' 
                  ? 'bg-[#B89F7A]/10 text-[#2C3E50] border border-[#B89F7A]/20' 
                  : 'bg-white text-[#4A4A4A] border border-[#D4C3A3]/50 shadow-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="p-3 rounded-sm bg-white border border-[#D4C3A3]/50 text-[#B89F7A] flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm italic">Consulting the oracle...</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="w-full pl-4 pr-12 py-3 bg-white border border-[#D4C3A3] rounded-sm focus:outline-none focus:ring-1 focus:ring-[#B89F7A] text-sm text-[#2C3E50] transition-shadow"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#B89F7A] hover:text-[#2C3E50] disabled:opacity-50 transition-colors"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
