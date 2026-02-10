import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  publishedAt: string;
}

interface YouTubeResult {
  emotion: string;
  language: string;
  videos: YouTubeVideo[];
}

export const useYouTubeRecommendations = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<YouTubeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const getRecommendations = useCallback(async (emotion: string, language: string = 'all') => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-youtube-recommendations', {
        body: { emotion, language },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setRecommendations(data);
      toast({
        title: 'Videos Found!',
        description: `Found ${data.videos.length} ${language !== 'all' ? language + ' ' : ''}videos for your ${emotion} mood`,
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get video recommendations';
      setError(message);
      toast({
        title: 'Video Recommendations Failed',
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

  return { getRecommendations, isLoading, recommendations, error, reset };
};
