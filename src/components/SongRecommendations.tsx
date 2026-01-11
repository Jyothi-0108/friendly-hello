import { ExternalLink, Play, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Track {
  id: string;
  name: string;
  artists: string;
  album: string;
  albumArt: string | null;
  previewUrl: string | null;
  spotifyUrl: string;
  duration: number;
}

interface SongRecommendationsProps {
  tracks: Track[];
  emotion: string;
  isLoading: boolean;
}

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const SongRecommendations = ({ tracks, emotion, isLoading }: SongRecommendationsProps) => {
  if (isLoading) {
    return (
      <div className="w-full max-w-2xl space-y-4">
        <h3 className="text-xl font-semibold text-foreground">Finding songs for your mood...</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 p-3 rounded-xl bg-card border border-border animate-pulse">
              <div className="w-16 h-16 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tracks.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
          <Music className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground">
            Songs for your <span className="text-gradient capitalize">{emotion}</span> mood
          </h3>
          <p className="text-sm text-muted-foreground">
            {tracks.length} personalized recommendations
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {tracks.map((track) => (
          <div 
            key={track.id}
            className="flex gap-4 p-3 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all group"
          >
            {track.albumArt ? (
              <img 
                src={track.albumArt} 
                alt={track.album}
                className="w-16 h-16 rounded-lg object-cover shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                <Music className="w-6 h-6 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground truncate">{track.name}</h4>
              <p className="text-sm text-muted-foreground truncate">{track.artists}</p>
              <p className="text-xs text-muted-foreground/70 truncate">
                {track.album} • {formatDuration(track.duration)}
              </p>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {track.previewUrl && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  onClick={() => {
                    const audio = new Audio(track.previewUrl!);
                    audio.play();
                  }}
                >
                  <Play className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9"
                asChild
              >
                <a href={track.spotifyUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SongRecommendations;
