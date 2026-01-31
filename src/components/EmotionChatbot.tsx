import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  emotion?: {
    dominantEmotion: string;
    confidence: number;
    emotions: Array<{ emotion: string; confidence: number }>;
  };
}

interface EmotionChatbotProps {
  onEmotionDetected: (result: {
    dominantEmotion: string;
    confidence: number;
    emotions: Array<{ emotion: string; confidence: number }>;
  }, userText: string) => void;
  isProcessing: boolean;
  currentEmotion?: string | null;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/emotion-chatbot`;

const EmotionChatbot = ({ onEmotionDetected, isProcessing, currentEmotion }: EmotionChatbotProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hey there! 👋 I'm here to understand how you're feeling and recommend the perfect music for your mood. Tell me about your day, what's on your mind, or how you're feeling right now!",
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = useCallback(async (userMessage: string) => {
    setIsStreaming(true);
    
    const assistantMsgId = crypto.randomUUID();
    let assistantContent = '';
    
    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })).concat([
            { role: 'user', content: userMessage }
          ]),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Add assistant message
      const newAssistantMsg: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: data.message,
        emotion: data.emotion,
      };
      
      setMessages(prev => [...prev, newAssistantMsg]);
      
      // If emotion detected, trigger the callback
      if (data.emotion && data.emotion.dominantEmotion) {
        onEmotionDetected(data.emotion, userMessage);
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        content: "I'm having trouble connecting right now. Could you try again?",
      }]);
    } finally {
      setIsStreaming(false);
    }
  }, [messages, onEmotionDetected]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || isStreaming || isProcessing) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // Add user message immediately
    const userMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: userMsgId,
      role: 'user',
      content: userMessage,
    }]);
    
    await streamChat(userMessage);
  }, [input, isStreaming, isProcessing, streamChat]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-card/50 backdrop-blur-sm rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/80">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
            currentEmotion ? "emotion-gradient emotion-glow" : "bg-primary/20"
          )}>
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Mood AI</h3>
            <p className="text-xs text-muted-foreground">
              {currentEmotion ? (
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Detected: <span className="capitalize emotion-primary">{currentEmotion}</span>
                </span>
              ) : (
                "Tell me how you're feeling"
              )}
            </p>
          </div>
        </div>
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
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                
                {message.emotion && (
                  <div className="mt-2 pt-2 border-t border-border/50 text-xs opacity-80">
                    <span className="capitalize">{message.emotion.dominantEmotion}</span>
                    <span className="ml-1">({Math.round(message.emotion.confidence)}% confidence)</span>
                  </div>
                )}
              </div>
              
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-secondary-foreground" />
                </div>
              )}
            </div>
          ))}
          
          {isStreaming && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
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
      <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-card/80">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share how you're feeling..."
            disabled={isStreaming || isProcessing}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isStreaming || isProcessing}
            className="emotion-gradient"
          >
            {isStreaming || isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Express your thoughts and I'll find the perfect music for your mood
        </p>
      </form>
    </div>
  );
};

export default EmotionChatbot;
