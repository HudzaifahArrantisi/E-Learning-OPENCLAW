import React, { useState, useRef, useEffect } from 'react';
import { FaRobot, FaTimes, FaPaperPlane, FaTrash, FaGraduationCap, FaUser, FaCode, FaChartLine, FaPalette, FaGlobe, FaBook, FaBriefcase, FaHeart, FaExclamationTriangle } from 'react-icons/fa';
import api from '../services/api';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [apiStatus, setApiStatus] = useState('unknown');
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      await api.get('/api/chatbot/health');
      setApiStatus('healthy');
    } catch (error) {
      setApiStatus('error');
      console.error('API health check failed:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const response = await api.post('/api/chatbot/chat', {
        message: userMessage,
        conversationId: conversationId
      });

      if (response.data.success) {
        if (!conversationId) {
          setConversationId(response.data.conversationId);
        }
        setMessages(response.data.history);
        setApiStatus('healthy');
      } else {
        throw new Error(response.data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      let errorContent = 'Maaf, sedang ada gangguan teknis. ';
      
      if (error.response?.status === 502) {
        errorContent += 'Layanan AI sedang tidak tersedia. Silakan coba lagi nanti.';
      } else if (error.response?.status === 503) {
        errorContent += 'Server sedang sibuk. Silakan coba beberapa saat lagi.';
      } else {
        errorContent += 'Silakan refresh halaman dan coba lagi.';
      }
      
      const errorMessage = {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setApiStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    if (conversationId) {
      try {
        await api.delete(`/api/chatbot/history/${conversationId}`);
      } catch (error) {
        console.error('Error clearing chat:', error);
      }
    }
    
    setMessages([]);
    setConversationId(null);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMessage = (content) => {
    if (!content) return null;
    
    const lines = content.split('\n');
    return lines.map((line, index) => {
      if (line.trim() === '') {
        return <br key={index} />;
      }
      
      const boldRegex = /\*\*(.*?)\*\*/g;
      let elements = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          elements.push(line.slice(lastIndex, match.index));
        }
        elements.push(
          <strong key={elements.length} className="font-semibold text-lp-text">
            {match[1]}
          </strong>
        );
        lastIndex = match.index + match[0].length;
      }
      
      if (lastIndex < line.length) {
        elements.push(line.slice(lastIndex));
      }
      
      if (elements.length === 0) {
        elements.push(line);
      }
      
      return (
        <div key={index} className="mb-1 leading-relaxed">
          {elements}
        </div>
      );
    });
  };

  const suggestedTopics = [
    {
      category: "💻 Programming Help",
      icon: FaCode,
      questions: [
        "Jelaskan perbedaan let, const, dan var dalam JavaScript",
        "Bagaimana cara membuat REST API dengan Node.js?",
        "Apa itu React hooks dan contoh penggunaannya?",
        "Cara fix error 'undefined is not a function'"
      ]
    },
    {
      category: "📚 Math & Science",
      icon: FaBook,
      questions: [
        "Jelaskan integral dan turunan dengan contoh",
        "Bagaimana menyelesaikan persamaan kuadrat?",
        "Apa perbedaan kinetik dan potensial energy?",
        "Cara menghitung probabilitas dalam statistik"
      ]
    },
    {
      category: "🎓 Academic Help",
      icon: FaGraduationCap,
      questions: [
        "Bagaimana struktur paper akademik yang baik?",
        "Cara membuat presentasi yang efektif",
        "Tips manajemen waktu untuk mahasiswa",
        "Cara menulis abstract untuk penelitian"
      ]
    },
    {
      category: "💡 Creative & Ideas",
      icon: FaPalette,
      questions: [
        "Buatkan ide project programming untuk pemula",
        "Cerita pendek tentang teknologi masa depan",
        "Ide nama untuk aplikasi mobile",
        "Desain sistem untuk manajemen tugas kampus"
      ]
    }
  ];

  const handleQuickQuestion = (question) => {
    setInputMessage(question);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const quickActions = [
    { icon: FaCode, label: "Programming", question: "Jelaskan cara kerja async/await dalam JavaScript dengan contoh" },
    { icon: FaBook, label: "Mathematics", question: "Bagaimana menyelesaikan sistem persamaan linear tiga variabel?" },
    { icon: FaPalette, label: "Creative", question: "Buatkan puisi tentang kecerdasan buatan" },
    { icon: FaBriefcase, label: "Academic", question: "Bagaimana cara menulis literature review yang baik?" }
  ];

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-lp-text text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:bg-lp-atext hover:-translate-y-1 transition-all duration-300 z-40 group"
        aria-label="Buka AI Assistant"
      >
        <FaRobot className="text-lg group-hover:scale-110 transition-transform" />
        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${
          apiStatus === 'healthy' ? 'bg-lp-green' : 
          apiStatus === 'error' ? 'bg-lp-red animate-pulse' : 'bg-lp-amber'
        }`}>
          {apiStatus === 'healthy' ? '✓' : apiStatus === 'error' ? '!' : '?'}
        </div>
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 md:p-6 animate-fadeIn">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Chat Container */}
          <div className="relative bg-white border border-lp-border rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.1)] w-full max-w-2xl h-[85vh] flex flex-col z-10 animate-slideUp">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-lp-border bg-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-lp-accentS border border-lp-borderA rounded-xl flex items-center justify-center">
                  <FaRobot className="text-lp-accent text-sm" />
                </div>
                <div>
                  <h3 className="font-bold text-lp-text text-[14px] tracking-tight">NF Assistant</h3>
                  <div className="flex items-center gap-2 text-[10px] text-lp-text3 font-mono tracking-wider">
                    <span>AI ASSISTANT</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      apiStatus === 'healthy' ? 'bg-lp-green' : 
                      apiStatus === 'error' ? 'bg-lp-red animate-pulse' : 'bg-lp-amber'
                    }`} />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {apiStatus === 'error' && (
                  <div className="flex items-center gap-1 text-lp-amber text-[10px] font-mono mr-2">
                    <FaExclamationTriangle className="text-[9px]" />
                    <span>Limited</span>
                  </div>
                )}
                <button
                  onClick={clearChat}
                  className="p-2 text-lp-text3 hover:text-lp-text2 hover:bg-lp-surface rounded-xl transition-colors"
                  title="Hapus Percakapan"
                >
                  <FaTrash className="text-xs" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-lp-text3 hover:text-lp-text2 hover:bg-lp-surface rounded-xl transition-colors"
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-lp-surface/30 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="text-center text-lp-text2 h-full flex flex-col justify-center">
                  <div className="mb-6">
                    <div className="w-14 h-14 mx-auto mb-4 bg-lp-accentS rounded-2xl flex items-center justify-center">
                      <FaRobot className="text-2xl text-lp-accent" />
                    </div>
                    <h3 className="text-xl font-semibold text-lp-text mb-2 tracking-tight">Halo! Saya NF Assistant</h3>
                    <p className="text-[13px] text-lp-text2 font-light mb-2">Asisten AI universal untuk membantu semua pertanyaan Anda</p>
                    
                    {apiStatus === 'error' && (
                      <div className="bg-lp-amber/8 border border-lp-amber/15 rounded-xl p-3 max-w-md mx-auto mb-4">
                        <div className="flex items-center gap-2 text-lp-amber text-[12px]">
                          <FaExclamationTriangle className="text-xs" />
                          <span>Sedang dalam mode terbatas. Beberapa fitur mungkin tidak tersedia.</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-3 mb-8">
                    {quickActions.map((action, index) => (
                      <button 
                        key={index}
                        onClick={() => handleQuickQuestion(action.question)}
                        className="flex items-center justify-center gap-2 p-3 bg-white border border-lp-border rounded-xl hover:border-lp-borderA hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:-translate-y-px transition-all duration-200 text-lp-text2 hover:text-lp-text"
                      >
                        <action.icon className="text-lp-accent text-sm" />
                        <span className="text-[12px] font-medium">{action.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Topics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto custom-scrollbar">
                    {suggestedTopics.map((topic, topicIndex) => (
                      <div key={topicIndex} className="bg-white border border-lp-border rounded-xl p-4 hover:border-lp-borderA hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-lp-accentS border border-lp-borderA flex items-center justify-center">
                            <topic.icon className="text-lp-accent text-xs" />
                          </div>
                          <h4 className="font-semibold text-lp-text text-[12px] tracking-tight">{topic.category}</h4>
                        </div>
                        <div className="space-y-1.5">
                          {topic.questions.map((question, qIndex) => (
                            <button
                              key={qIndex}
                              onClick={() => handleQuickQuestion(question)}
                              className="text-left w-full p-2 text-[11px] text-lp-text2 font-light hover:bg-lp-accentS rounded-lg transition-colors hover:text-lp-atext"
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} gap-2.5`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-7 h-7 bg-lp-accentS border border-lp-borderA rounded-xl flex items-center justify-center flex-shrink-0">
                        <FaRobot className="text-lp-accent text-[10px]" />
                      </div>
                    )}
                    
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 ${
                        message.role === 'user'
                          ? 'bg-lp-text text-white rounded-br-sm'
                          : message.isError
                          ? 'bg-lp-red/5 text-lp-red border border-lp-red/15'
                          : 'bg-white border border-lp-border rounded-bl-sm'
                      }`}
                    >
                      <div className="text-[13px] font-light whitespace-pre-wrap leading-relaxed">
                        {formatMessage(message.content)}
                      </div>
                      <div className={`text-[10px] mt-2 font-mono ${
                        message.role === 'user' ? 'text-white/50' : 'text-lp-text3'
                      }`}>
                        {formatTime(message.timestamp)}
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <div className="w-7 h-7 bg-lp-surface border border-lp-border rounded-xl flex items-center justify-center flex-shrink-0">
                        <FaUser className="text-lp-text3 text-[10px]" />
                      </div>
                    )}
                  </div>
                ))
              )}
              
              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex justify-start gap-2.5">
                  <div className="w-7 h-7 bg-lp-accentS border border-lp-borderA rounded-xl flex items-center justify-center flex-shrink-0">
                    <FaRobot className="text-lp-accent text-[10px]" />
                  </div>
                  <div className="bg-white border border-lp-border rounded-2xl rounded-bl-sm p-4 max-w-[85%]">
                    <div className="flex items-center gap-2 text-lp-text3">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-lp-accent rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-lp-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-1.5 h-1.5 bg-lp-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                      <span className="text-[11px] font-light">NF Assistant sedang mengetik...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form 
              onSubmit={handleSendMessage}
              className="p-4 border-t border-lp-border bg-white rounded-b-2xl"
            >
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Tanyakan apa saja..."
                  className="flex-1 border border-lp-border rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-lp-accent/10 focus:border-lp-borderA text-[13px] font-light text-lp-text placeholder:text-lp-text3 transition-all"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      handleSendMessage(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-lp-text text-white rounded-full w-11 h-11 flex items-center justify-center hover:bg-lp-atext hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <FaPaperPlane className="text-xs" />
                </button>
              </div>
              <div className="flex justify-between items-center mt-2.5">
                <p className="text-[10px] font-mono text-lp-text3 tracking-wider">
                  NF ASSISTANT · POWERED BY AI
                </p>
                <div className="flex items-center gap-1 text-[10px] text-lp-text3 font-mono">
                  <div className="w-1 h-1 rounded-full bg-lp-accent/40" />
                  <span>STUDENTHUB</span>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;