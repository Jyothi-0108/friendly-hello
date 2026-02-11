import { useState } from 'react';
import { ExternalLink, Play, X } from 'lucide-react';
import type { YouTubeVideo } from '@/hooks/useYouTubeRecommendations';

interface VideoRecommendationsProps {
  videos: YouTubeVideo[];
  emotion: string;
  isLoading: boolean;
}

const VideoRecommendations = ({ videos, emotion, isLoading }: VideoRecommendationsProps) => {
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <h3 className="text-xl font-semibold text-foreground">Finding videos for your mood...</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl bg-card border border-border animate-pulse overflow-hidden">
              <div className="aspect-video bg-muted" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
          <Play className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground">
            Videos for your <span className="text-gradient capitalize">{emotion}</span> mood
          </h3>
          <p className="text-sm text-muted-foreground">
            {videos.length} YouTube recommendations
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {videos.map((video) => (
          <div
            key={video.id}
            className="group rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all overflow-hidden"
          >
            {playingVideoId === video.id ? (
              <div className="relative aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${video.id}?autoplay=1`}
                  title={video.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <button
                  onClick={() => setPlayingVideoId(null)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <div
                className="relative aspect-video cursor-pointer"
                onClick={() => setPlayingVideoId(video.id)}
              >
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-destructive/90 flex items-center justify-center">
                    <Play className="w-7 h-7 text-white fill-white" />
                  </div>
                </div>
              </div>
            )}
            <div className="p-3">
              <h4 className="font-medium text-foreground text-sm line-clamp-2 mb-1">{video.title}</h4>
              <p className="text-xs text-muted-foreground truncate">{video.channelTitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoRecommendations;
