import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EmotionData {
  emotion: string;
  confidence: number;
}

interface EmotionHistoryEntry {
  detectionMode: 'camera' | 'text' | 'voice';
  dominantEmotion: string;
  confidence: number;
  emotions: EmotionData[];
  transcribedText?: string;
}

interface PlayHistoryEntry {
  trackId: string;
  trackName: string;
  artists: string;
  album?: string;
  albumArt?: string;
  spotifyUrl?: string;
  emotion?: string;
}

export const useHistory = () => {
  const { user } = useAuth();

  const saveEmotionHistory = useCallback(async (entry: EmotionHistoryEntry) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('emotion_history').insert({
        user_id: user.id,
        detection_mode: entry.detectionMode,
        dominant_emotion: entry.dominantEmotion,
        confidence: entry.confidence,
        emotions: entry.emotions as unknown as Record<string, unknown>,
        transcribed_text: entry.transcribedText,
      } as any);

      if (error) {
        console.error('Failed to save emotion history:', error);
      }
    } catch (err) {
      console.error('Error saving emotion history:', err);
    }
  }, [user]);

  const savePlayHistory = useCallback(async (entry: PlayHistoryEntry) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('play_history').insert({
        user_id: user.id,
        track_id: entry.trackId,
        track_name: entry.trackName,
        artists: entry.artists,
        album: entry.album,
        album_art: entry.albumArt,
        spotify_url: entry.spotifyUrl,
        emotion: entry.emotion,
      } as any);

      if (error) {
        console.error('Failed to save play history:', error);
      }
    } catch (err) {
      console.error('Error saving play history:', err);
    }
  }, [user]);

  return {
    saveEmotionHistory,
    savePlayHistory,
  };
};
