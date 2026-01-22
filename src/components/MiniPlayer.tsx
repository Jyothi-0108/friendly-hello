import { Play, Pause, X, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface MiniPlayerProps {
  track: {
    name: string;
    artists: string;
    albumArt: string | null;
  } | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  onPlayPause: () => void;
  onClose: () => void;
}

const MiniPlayer = ({ track, isPlaying, progress, duration, onPlayPause, onClose }: MiniPlayerProps) => {
  if (!track) return null;

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border shadow-lg">
      <Progress value={progressPercent} className="h-1 rounded-none" />
      
      <div className="flex items-center gap-4 p-3 max-w-5xl mx-auto">
        {track.albumArt ? (
          <img 
            src={track.albumArt} 
            alt="Album art"
            className="w-12 h-12 rounded-lg object-cover shadow-md"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
            <Music className="w-5 h-5 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate text-sm">{track.name}</p>
          <p className="text-xs text-muted-foreground truncate">{track.artists}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-full"
            onClick={onPlayPause}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;
