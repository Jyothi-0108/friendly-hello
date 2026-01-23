import { Play, Pause, X, Music, Volume2, VolumeX, Volume1 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface MiniPlayerProps {
  track: {
    name: string;
    artists: string;
    albumArt: string | null;
  } | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  onPlayPause: () => void;
  onClose: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (level: number) => void;
  onToggleMute: () => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const MiniPlayer = ({ 
  track, 
  isPlaying, 
  progress, 
  duration, 
  volume,
  isMuted,
  onPlayPause, 
  onClose,
  onSeek,
  onVolumeChange,
  onToggleMute,
}: MiniPlayerProps) => {
  if (!track) return null;

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const displayVolume = isMuted ? 0 : volume;

  const VolumeIcon = isMuted || volume === 0 
    ? VolumeX 
    : volume < 0.5 
      ? Volume1 
      : Volume2;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border shadow-lg">
      {/* Seek bar at top */}
      <div className="px-4 pt-2">
        <Slider
          value={[progressPercent]}
          max={100}
          step={0.1}
          onValueChange={(value) => {
            const newTime = (value[0] / 100) * duration;
            onSeek(newTime);
          }}
          className="h-1 cursor-pointer"
        />
      </div>
      
      <div className="flex items-center gap-4 p-3 max-w-5xl mx-auto">
        {/* Album art */}
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

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate text-sm">{track.name}</p>
          <p className="text-xs text-muted-foreground truncate">{track.artists}</p>
        </div>

        {/* Time display */}
        <div className="hidden sm:flex text-xs text-muted-foreground gap-1 tabular-nums">
          <span>{formatTime(progress)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Volume control */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onToggleMute}
          >
            <VolumeIcon className="w-4 h-4" />
          </Button>
          <Slider
            value={[displayVolume * 100]}
            max={100}
            step={1}
            onValueChange={(value) => onVolumeChange(value[0] / 100)}
            className="w-20 cursor-pointer"
          />
        </div>

        {/* Play/Pause and Close buttons */}
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
