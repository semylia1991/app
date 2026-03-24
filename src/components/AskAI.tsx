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
