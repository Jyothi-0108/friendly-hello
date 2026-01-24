import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

interface EmotionData {
  emotion: string;
  confidence: number;
}

interface FaceData {
  faceId: number;
  position: string;
  dominantEmotion: string;
  confidence: number;
  emotions: EmotionData[];
}

interface MultiFaceEmotionDisplayProps {
  faces: FaceData[];
  selectedFaceId: number | null;
  onSelectFace: (faceId: number) => void;
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

const emotionBorderColors: Record<string, string> = {
  happy: 'border-yellow-400',
  sad: 'border-blue-400',
  angry: 'border-red-500',
  fear: 'border-purple-400',
  surprise: 'border-pink-400',
  disgust: 'border-green-400',
  neutral: 'border-gray-400',
};

const MultiFaceEmotionDisplay = ({ faces, selectedFaceId, onSelectFace }: MultiFaceEmotionDisplayProps) => {
  const selectedFace = faces.find(f => f.faceId === selectedFaceId) || faces[0];

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* Multi-face indicator */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Users className="w-5 h-5" />
        <span className="text-sm font-medium">{faces.length} people detected</span>
      </div>

      {/* Face selector cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {faces.map((face) => {
          const emoji = emotionEmojis[face.dominantEmotion.toLowerCase()] || '🎭';
          const gradientClass = emotionColors[face.dominantEmotion.toLowerCase()] || emotionColors.neutral;
          const borderClass = emotionBorderColors[face.dominantEmotion.toLowerCase()] || 'border-border';
          const isSelected = face.faceId === selectedFaceId;

          return (
            <button
              key={face.faceId}
              onClick={() => onSelectFace(face.faceId)}
              className={cn(
                "p-4 rounded-xl text-center transition-all duration-200 border-2",
                isSelected 
                  ? cn("bg-gradient-to-br shadow-lg scale-105", gradientClass, borderClass)
                  : "bg-card hover:bg-muted border-border hover:border-primary/50"
              )}
            >
              <div className="text-3xl mb-2">{emoji}</div>
              <div className={cn(
                "text-sm font-semibold capitalize",
                isSelected ? "text-white" : "text-foreground"
              )}>
                Person {face.faceId}
              </div>
              <div className={cn(
                "text-xs capitalize",
                isSelected ? "text-white/80" : "text-muted-foreground"
              )}>
                {face.position}
              </div>
              <div className={cn(
                "text-xs mt-1",
                isSelected ? "text-white/70" : "text-muted-foreground"
              )}>
                {face.confidence}% {face.dominantEmotion}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected face details */}
      {selectedFace && (
        <div className="space-y-4">
          {/* Main emotion display */}
          <div className={cn(
            "p-6 rounded-2xl text-center bg-gradient-to-br shadow-lg",
            emotionColors[selectedFace.dominantEmotion.toLowerCase()] || emotionColors.neutral
          )}>
            <div className="text-6xl mb-3">
              {emotionEmojis[selectedFace.dominantEmotion.toLowerCase()] || '🎭'}
            </div>
            <h3 className="text-2xl font-bold text-white capitalize mb-1">
              Person {selectedFace.faceId}: {selectedFace.dominantEmotion}
            </h3>
            <p className="text-white/80 text-sm">
              {selectedFace.confidence}% confidence • {selectedFace.position}
            </p>
          </div>

          {/* Emotion breakdown */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Emotion Breakdown - Person {selectedFace.faceId}
            </h4>
            {selectedFace.emotions.slice(0, 5).map((item) => (
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
      )}
    </div>
  );
};

export default MultiFaceEmotionDisplay;
