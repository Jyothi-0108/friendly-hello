import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, MessageCircle, User, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  emotion?: string;
}

interface EmotionChatbotProps {
  onEmotionDetected: (result: { dominantEmotion: string; confidence: number; emotions: Array<{ emotion: string; confidence: number }> }, userText: string) => void;
  isProcessing: boolean;
  currentEmotion: string | null;
}

const EmotionChatbot = ({ onEmotionDetected, isProcessing, currentEmotion }: EmotionChatbotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hey there! 👋 I'm your Mood AI companion. Tell me how you're feeling today, and I'll find the perfect music to match your vibe!"
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    const userText = input.trim();
    setInput('');
    setIsStreaming(true);

    try {
      const { data, error } = await supabase.functions.invoke('emotion-chatbot', {
        body: { 
          message: userText,
          conversationHistory: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        emotion: data.emotion?.dominantEmotion
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.emotion) {
        const emotions = [
          { emotion: data.emotion.dominantEmotion, confidence: data.emotion.confidence },
          { emotion: 'neutral', confidence: 1 - data.emotion.confidence }
        ];
        onEmotionDetected({
          dominantEmotion: data.emotion.dominantEmotion,
          confidence: data.emotion.confidence,
          emotions
        }, userText);
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Oops! I'm having trouble connecting right now. Try again in a moment! 🔄"
      }]);
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, isProcessing, messages, onEmotionDetected]);

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110",
          currentEmotion ? "emotion-gradient emotion-glow" : "bg-primary"
        )}
      >
        <MessageCircle className="w-6 h-6 text-primary-foreground" />
        {currentEmotion && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background" />
        )}
      </button>
    );
  }

  // Expanded chat panel
  return (
    <div className="fixed bottom-6 left-6 z-50 w-[350px] h-[500px] bg-card/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
            currentEmotion ? "emotion-gradient emotion-glow" : "bg-primary/20"
          )}>
            <MessageCircle className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Mood AI</h3>
            <p className="text-xs text-muted-foreground">
              {currentEmotion ? `Feeling ${currentEmotion}` : 'Ready to chat'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-primary" />
                </div>
              )}
              
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                )}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                {message.emotion && (
                  <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
                    <Sparkles className="w-3 h-3" />
                    <span>Detected: {message.emotion}</span>
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          
          {isStreaming && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Analyzing your mood...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-card/50">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="How are you feeling?"
            disabled={isStreaming || isProcessing}
            className="flex-1 bg-background/50"
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!input.trim() || isStreaming || isProcessing}
            className={cn(
              "transition-all",
              currentEmotion && "emotion-gradient"
            )}
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EmotionChatbot;
