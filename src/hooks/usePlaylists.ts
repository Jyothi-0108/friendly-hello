import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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

export const usePlaylists = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPlaylists = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data: playlistsData, error: playlistsError } = await supabase
        .from('playlists')
        .select('*')
        .order('created_at', { ascending: false });

      if (playlistsError) throw playlistsError;

      // Fetch tracks for each playlist
      const playlistsWithTracks = await Promise.all(
        (playlistsData || []).map(async (playlist) => {
          const { data: tracksData } = await supabase
            .from('playlist_tracks')
            .select('*')
            .eq('playlist_id', playlist.id)
            .order('position');

          return {
            ...playlist,
            tracks: (tracksData || []).map(t => ({
              id: t.track_id,
              name: t.track_name,
              artists: t.artists,
              album: t.album || undefined,
              albumArt: t.album_art,
              previewUrl: t.preview_url,
              spotifyUrl: t.spotify_url || undefined,
              duration: t.duration || undefined,
            })),
          };
        })
      );

      setPlaylists(playlistsWithTracks);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
      toast({
        title: 'Error',
        description: 'Failed to load playlists',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const savePlaylist = useCallback(async (
    name: string,
    emotion: string,
    tracks: Track[]
  ): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to save playlists',
        variant: 'destructive',
      });
      return false;
    }

    setIsSaving(true);
    try {
      // Create playlist
      const { data: playlist, error: playlistError } = await supabase
        .from('playlists')
        .insert({
          user_id: user.id,
          name,
          emotion,
        })
        .select()
        .single();

      if (playlistError) throw playlistError;

      // Insert tracks
      const tracksToInsert = tracks.map((track, index) => ({
        playlist_id: playlist.id,
        track_id: track.id,
        track_name: track.name,
        artists: track.artists,
        album: track.album || null,
        album_art: track.albumArt || null,
        preview_url: track.previewUrl || null,
        spotify_url: track.spotifyUrl || null,
        duration: track.duration || null,
        position: index,
      }));

      const { error: tracksError } = await supabase
        .from('playlist_tracks')
        .insert(tracksToInsert);

      if (tracksError) throw tracksError;

      toast({
        title: 'Playlist Saved!',
        description: `"${name}" has been saved with ${tracks.length} tracks`,
      });

      // Refresh playlists
      await fetchPlaylists();
      return true;
    } catch (error) {
      console.error('Failed to save playlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to save playlist',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user, toast, fetchPlaylists]);

  const deletePlaylist = useCallback(async (playlistId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;

      toast({
        title: 'Playlist Deleted',
        description: 'The playlist has been removed',
      });

      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
      return true;
    } catch (error) {
      console.error('Failed to delete playlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete playlist',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  return {
    playlists,
    isLoading,
    isSaving,
    fetchPlaylists,
    savePlaylist,
    deletePlaylist,
  };
};
