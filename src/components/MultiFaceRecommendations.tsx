import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Music, ExternalLink, Play, Pause, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

interface FaceRecommendations {
  faceId: number;
  emotion: string;
  tracks: Track[];
  isLoading: boolean;
}

interface MultiFaceRecommendationsProps {
  faceRecommendations: FaceRecommendations[];
  selectedFaceId: number | null;
  onSelectFace: (faceId: number) => void;
  currentTrackId?: string | null;
  isPlaying?: boolean;
  onPlayTrack?: (track: Track, emotion: string) => void;
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

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const MultiFaceRecommendations = ({
  faceRecommendations,
  selectedFaceId,
  onSelectFace,
  currentTrackId,
  isPlaying,
  onPlayTrack,
}: MultiFaceRecommendationsProps) => {
  const selectedRecs = faceRecommendations.find(r => r.faceId === selectedFaceId) || faceRecommendations[0];

  if (!selectedRecs) return null;

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Header with face selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
            <Music className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gradient">Personalized Recommendations</h3>
            <p className="text-muted-foreground text-sm">Songs for each person's mood</p>
          </div>
        </div>
        
        {/* Face tabs */}
        <div className="flex gap-2">
          {faceRecommendations.map((rec) => (
            <Button
              key={rec.faceId}
              variant={rec.faceId === selectedFaceId ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectFace(rec.faceId)}
              className="gap-2"
            >
              <span>{emotionEmojis[rec.emotion.toLowerCase()] || '🎭'}</span>
              <span className="hidden sm:inline">Person {rec.faceId}</span>
              <span className="sm:hidden">P{rec.faceId}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Current emotion label */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 w-fit">
        <span className="text-lg">{emotionEmojis[selectedRecs.emotion.toLowerCase()] || '🎭'}</span>
        <span className="text-sm font-medium">
          Songs for Person {selectedRecs.faceId}'s <span className="capitalize text-primary">{selectedRecs.emotion}</span> mood
        </span>
      </div>

      {/* Loading state */}
      {selectedRecs.isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-xl bg-card border border-border">
              <Skeleton className="w-16 h-16 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tracks */}
      {!selectedRecs.isLoading && selectedRecs.tracks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedRecs.tracks.map((track) => {
            const isCurrentTrack = currentTrackId === track.id;
            const showPause = isCurrentTrack && isPlaying;

            return (
              <div
                key={track.id}
                className={cn(
                  "group flex gap-4 p-4 rounded-xl bg-card border transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10",
                  isCurrentTrack ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                {/* Album art */}
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {track.albumArt ? (
                    <img
                      src={track.albumArt}
                      alt={track.album}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Play overlay */}
                  {track.previewUrl && onPlayTrack && (
                    <button
                      onClick={() => onPlayTrack(track, selectedRecs.emotion)}
                      className={cn(
                        "absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity",
                        isCurrentTrack ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                    >
                      {showPause ? (
                        <Pause className="w-6 h-6 text-white" fill="white" />
                      ) : (
                        <Play className="w-6 h-6 text-white" fill="white" />
                      )}
                    </button>
                  )}
                </div>

                {/* Track info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground truncate">{track.name}</h4>
                  <p className="text-sm text-muted-foreground truncate">{track.artists}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{formatDuration(track.duration)}</span>
                    <a
                      href={track.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open in Spotify
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!selectedRecs.isLoading && selectedRecs.tracks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No recommendations found for this mood. Try again!
        </div>
      )}
    </div>
  );
};

export default MultiFaceRecommendations;
