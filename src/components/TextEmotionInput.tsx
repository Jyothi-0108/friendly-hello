import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface TextEmotionInputProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
}

const TextEmotionInput = ({ onSubmit, isProcessing }: TextEmotionInputProps) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (text.trim() && !isProcessing) {
      onSubmit(text.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="relative">
        <Textarea
          placeholder="Describe how you're feeling right now..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          className="min-h-[120px] pr-12 resize-none text-base"
          maxLength={500}
        />
        <span className="absolute bottom-2 left-3 text-xs text-muted-foreground">
          {text.length}/500
        </span>
      </div>
      
      <Button
        onClick={handleSubmit}
        disabled={!text.trim() || isProcessing}
        className="w-full gap-2"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Detect Emotion
          </>
        )}
      </Button>
      
      <p className="text-xs text-muted-foreground text-center">
        Express your current mood, thoughts, or feelings in your own words
      </p>
    </div>
  );
};

export default TextEmotionInput;
