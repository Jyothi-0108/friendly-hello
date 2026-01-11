import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface RecommendationResult {
  tracks: Track[];
  emotion: string;
  genres: string[];
}

export const useSpotifyRecommendations = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const getRecommendations = useCallback(async (emotion: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-spotify-recommendations', {
        body: { emotion },
      });

      if (fnError) {
        throw fnError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setRecommendations(data);
      toast({
        title: 'Songs Found!',
        description: `Found ${data.tracks.length} songs matching your ${emotion} mood`,
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get recommendations';
      setError(message);
      toast({
        title: 'Recommendations Failed',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const reset = useCallback(() => {
    setRecommendations(null);
    setError(null);
  }, []);

  return {
    getRecommendations,
    isLoading,
    recommendations,
    error,
    reset,
  };
};
