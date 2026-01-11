import { cn } from '@/lib/utils';

interface EmotionData {
  emotion: string;
  confidence: number;
}

interface EmotionDisplayProps {
  dominantEmotion: string;
  confidence: number;
  allEmotions: EmotionData[];
}

const emotionEmojis: Record<string, string> = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  fear: '😨',
  surprise: '😲',
  disgust: '🤢',
  neutral: '😐',
};

const emotionColors: Record<string, string> = {
  happy: 'from-yellow-400 to-orange-400',
  sad: 'from-blue-400 to-indigo-500',
  angry: 'from-red-500 to-orange-600',
  fear: 'from-purple-400 to-violet-500',
  surprise: 'from-pink-400 to-rose-500',
  disgust: 'from-green-400 to-emerald-500',
  neutral: 'from-gray-400 to-slate-500',
};

const EmotionDisplay = ({ dominantEmotion, confidence, allEmotions }: EmotionDisplayProps) => {
  const emoji = emotionEmojis[dominantEmotion.toLowerCase()] || '🎭';
  const gradientClass = emotionColors[dominantEmotion.toLowerCase()] || emotionColors.neutral;

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Main emotion display */}
      <div className={cn(
        "p-6 rounded-2xl text-center bg-gradient-to-br shadow-lg",
        gradientClass
      )}>
        <div className="text-6xl mb-3">{emoji}</div>
        <h3 className="text-2xl font-bold text-white capitalize mb-1">
          {dominantEmotion}
        </h3>
        <p className="text-white/80 text-sm">
          {confidence}% confidence
        </p>
      </div>

      {/* Emotion breakdown */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Emotion Breakdown</h4>
        {allEmotions.slice(0, 5).map((item) => (
          <div key={item.emotion} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="capitalize flex items-center gap-2">
                {emotionEmojis[item.emotion.toLowerCase()] || '🎭'}
                {item.emotion}
              </span>
              <span className="text-muted-foreground">{item.confidence}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                  emotionColors[item.emotion.toLowerCase()] || emotionColors.neutral
                )}
                style={{ width: `${item.confidence}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmotionDisplay;
