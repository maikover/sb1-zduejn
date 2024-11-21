import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Loader2, Bot, Trash2, ImagePlus, Settings2, Moon, Sun, Mic } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { ModelSelector } from './components/ModelSelector';
import { SystemInstructionsModal } from './components/SystemInstructionsModal';
import { geminiService, ModelType } from './services/gemini';

interface Message {
  text: string;
  isBot: boolean;
  imageData?: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<ModelType>('gemini-1.5-pro');
  const [imageData, setImageData] = useState<string | null>(null);
  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState(false);
  const [systemInstructions, setSystemInstructions] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const previousInputRef = useRef('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    setMessages([{ 
      text: "¡Hola! Soy Gemini. ¿En qué puedo ayudarte hoy?", 
      isBot: true 
    }]);

    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      setError('Por favor agrega tu API key de Gemini en el archivo .env');
    }

    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        setInput(previousInputRef.current + ' ' + transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startVoiceInput = () => {
    if (!recognitionRef.current) {
      setError('Tu navegador no soporta entrada por voz');
      return;
    }

    previousInputRef.current = input;
    recognitionRef.current.start();
    setIsListening(true);
    setError(null);
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            await handleImageUpload(file);
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleModelChange = (model: ModelType) => {
    setCurrentModel(model);
    geminiService.setModel(model);
  };

  const handleSystemInstructions = (instructions: string) => {
    setSystemInstructions(instructions);
    geminiService.setSystemInstructions(instructions);
  };

  const handleImageUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageData(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearChat = () => {
    setMessages([{ 
      text: "¡Hola! Soy Gemini. ¿En qué puedo ayudarte hoy?", 
      isBot: true 
    }]);
    setImageData(null);
    geminiService.resetChat();
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !imageData) || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    setMessages(prev => [...prev, { 
      text: userMessage || "Analiza esta imagen por favor", 
      isBot: false,
      imageData: imageData || undefined
    }]);

    setIsLoading(true);

    try {
      const response = await geminiService.chat(userMessage || "Describe esta imagen en detalle", imageData || undefined);
      setMessages(prev => [...prev, { text: response, isBot: true }]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setImageData(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-primary">
      <header className="bg-primary border-b border-border fixed w-full top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 flex items-center justify-center">
                <Bot size={20} />
              </div>
              <h1 className="text-xl font-semibold">El Chat Que No Lograrán Tumbar</h1>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <ModelSelector currentModel={currentModel} onModelChange={handleModelChange} />
              <button
                onClick={toggleDarkMode}
                className="p-2 text-secondary hover:bg-secondary rounded-lg transition-colors"
                title={isDarkMode ? "Modo claro" : "Modo oscuro"}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button
                onClick={() => setIsInstructionsModalOpen(true)}
                className="p-2 text-secondary hover:bg-secondary rounded-lg transition-colors"
                title="Instrucciones del Sistema"
              >
                <Settings2 size={20} />
              </button>
              <button
                onClick={clearChat}
                className="p-2 text-secondary hover:bg-secondary rounded-lg transition-colors"
                title="Limpiar chat"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-2">
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/50 p-3 rounded-lg">
                {error}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-24 pb-24">
        <div className="max-w-4xl mx-auto px-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index}>
                <ChatMessage message={message.text} isBot={message.isBot} />
                {message.imageData && (
                  <div className="flex justify-center p-4 bg-primary rounded-lg border border-border mt-2">
                    <img src={message.imageData} alt="Uploaded" className="max-h-64 rounded" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-secondary p-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Pensando...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-primary fixed bottom-0 w-full">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-secondary hover:bg-secondary rounded-lg transition-colors"
              title="Subir imagen"
            >
              <ImagePlus size={20} />
            </button>
            <button
              type="button"
              onMouseDown={startVoiceInput}
              onMouseUp={stopVoiceInput}
              onMouseLeave={stopVoiceInput}
              className={`p-2 rounded-lg transition-colors ${
                isListening 
                  ? 'text-red-500 hover:bg-red-100 dark:hover:bg-red-900' 
                  : 'text-secondary hover:bg-secondary'
              }`}
              title="Mantén presionado para grabar"
            >
              <Mic size={20} />
            </button>
            <textarea
              ref={textAreaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Escribe tu mensaje..."
              className="w-full rounded-lg border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent textarea-expand bg-primary text-primary"
              disabled={isLoading || !!error}
            />
            <button
              type="submit"
              disabled={(!input.trim() && !imageData) || isLoading || !!error}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 dark:bg-purple-500 dark:hover:bg-purple-600"
            >
              <SendHorizontal className="w-4 h-4" />
              Enviar
            </button>
          </form>
        </div>
      </footer>

      <SystemInstructionsModal
        isOpen={isInstructionsModalOpen}
        onClose={() => setIsInstructionsModalOpen(false)}
        currentInstructions={systemInstructions}
        onSave={handleSystemInstructions}
      />
    </div>
  );
}

export default App;