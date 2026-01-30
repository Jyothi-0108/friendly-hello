import { useEffect } from 'react';
import { Library, Play, Trash2, Music, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Track {
  id: string;
  name: string;
  artists: string;
  album?: string;
  albumArt?: string | null;
  previewUrl?: string | null;
  spotifyUrl?: string;
  duration?: number;
}

interface Playlist {
  id: string;
  name: string;
  emotion: string;
  created_at: string;
  tracks?: Track[];
}

interface PlaylistsDrawerProps {
  playlists: Playlist[];
  isLoading: boolean;
  onFetch: () => void;
  onPlayTrack: (track: Track) => void;
  onDelete: (playlistId: string) => void;
  currentTrackId?: string;
  isPlaying: boolean;
}

const emotionColors: Record<string, string> = {
  happy: 'bg-yellow-500/20 text-yellow-600',
  sad: 'bg-blue-500/20 text-blue-600',
  angry: 'bg-red-500/20 text-red-600',
  fear: 'bg-purple-500/20 text-purple-600',
  surprise: 'bg-pink-500/20 text-pink-600',
  disgust: 'bg-green-500/20 text-green-600',
  neutral: 'bg-gray-500/20 text-gray-600',
};

const PlaylistsDrawer = ({
  playlists,
  isLoading,
  onFetch,
  onPlayTrack,
  onDelete,
  currentTrackId,
  isPlaying,
}: PlaylistsDrawerProps) => {
  useEffect(() => {
    onFetch();
  }, [onFetch]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Library className="w-4 h-4" />
          My Playlists
          {playlists.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {playlists.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Library className="w-5 h-5 text-primary" />
            Saved Playlists
          </SheetTitle>
          <SheetDescription>
            Your mood-based playlists saved for later listening
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Music className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No playlists saved yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Detect your mood and save recommendations!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="bg-card border border-border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{playlist.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge className={cn('text-xs', emotionColors[playlist.emotion] || emotionColors.neutral)}>
                          {playlist.emotion}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(playlist.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(playlist.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Tracks list */}
                  <div className="space-y-1.5">
                    {playlist.tracks?.slice(0, 5).map((track, idx) => (
                      <div
                        key={track.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                          currentTrackId === track.id && isPlaying
                            ? "bg-primary/20"
                            : "hover:bg-muted"
                        )}
                        onClick={() => track.previewUrl && onPlayTrack(track)}
                      >
                        {track.albumArt ? (
                          <img
                            src={track.albumArt}
                            alt={track.name}
                            className="w-8 h-8 rounded object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                            <Music className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{track.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {track.artists}
                          </p>
                        </div>
                        {track.previewUrl && (
                          <Play className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    ))}
                    {(playlist.tracks?.length || 0) > 5 && (
                      <p className="text-xs text-muted-foreground pl-2">
                        +{(playlist.tracks?.length || 0) - 5} more tracks
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default PlaylistsDrawer;
