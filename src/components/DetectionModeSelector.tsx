import { Camera, MessageSquare, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DetectionMode = 'camera' | 'text' | 'voice';

interface DetectionModeSelectorProps {
  mode: DetectionMode;
  onModeChange: (mode: DetectionMode) => void;
  disabled?: boolean;
}

const modes = [
  { id: 'camera' as const, label: 'Camera', icon: Camera, description: 'Facial expression' },
  { id: 'text' as const, label: 'Text', icon: MessageSquare, description: 'Write how you feel' },
  { id: 'voice' as const, label: 'Voice', icon: Mic, description: 'Speak your mind' },
];

const DetectionModeSelector = ({ mode, onModeChange, disabled }: DetectionModeSelectorProps) => {
  return (
    <div className="flex gap-2 p-1 bg-muted rounded-xl">
      {modes.map(({ id, label, icon: Icon, description }) => (
        <button
          key={id}
          onClick={() => onModeChange(id)}
          disabled={disabled}
          className={cn(
            'flex-1 flex flex-col items-center gap-1 py-3 px-4 rounded-lg transition-all',
            mode === id
              ? 'bg-background shadow-md text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Icon className="w-5 h-5" />
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground hidden sm:block">{description}</span>
        </button>
      ))}
    </div>
  );
};

export default DetectionModeSelector;
