import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmotionData {
  emotion: string;
  confidence: number;
}

interface EmotionResult {
  emotions: EmotionData[];
  dominantEmotion: string;
  confidence: number;
  transcribedText?: string;
  faceDetected?: boolean;
  detectionStatus?: string;
}

interface FaceDetectionError {
  faceDetected: false;
  detectionStatus: string;
  error: string;
}

export const useEmotionDetection = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [emotionResult, setEmotionResult] = useState<EmotionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [faceDetectionError, setFaceDetectionError] = useState<FaceDetectionError | null>(null);
  const { toast } = useToast();

  const detectEmotion = useCallback(async (imageBase64: string) => {
    setIsProcessing(true);
    setError(null);
    setFaceDetectionError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('detect-emotion', {
        body: { imageBase64 },
      });

      if (fnError) throw fnError;

      // Handle face not detected scenarios
      if (data.faceDetected === false) {
        const errorData: FaceDetectionError = {
          faceDetected: false,
          detectionStatus: data.detectionStatus,
          error: data.error,
        };
        setFaceDetectionError(errorData);
        
        // Show appropriate toast based on detection status
        const titles: Record<string, string> = {
          no_face: 'No Face Detected',
          poor_lighting: 'Poor Lighting',
          partial_face: 'Partial Face',
          blurry: 'Image Blurry',
          multiple_faces: 'Multiple Faces',
        };
        
        toast({
          title: titles[data.detectionStatus] || 'Face Not Detected',
          description: data.error,
          variant: 'destructive',
        });
        return null;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setEmotionResult(data);
      toast({
        title: 'Emotion Detected!',
        description: `You seem ${data.dominantEmotion} (${data.confidence}% confidence)`,
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to detect emotion';
      setError(message);
      toast({ title: 'Detection Failed', description: message, variant: 'destructive' });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const detectTextEmotion = useCallback(async (text: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('detect-text-emotion', {
        body: { text },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setEmotionResult(data);
      toast({
        title: 'Emotion Detected!',
        description: `You seem ${data.dominantEmotion} (${data.confidence}% confidence)`,
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to detect emotion';
      setError(message);
      toast({ title: 'Detection Failed', description: message, variant: 'destructive' });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const detectVoiceEmotion = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/detect-voice-emotion`,
        {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setEmotionResult(data);
      toast({
        title: 'Emotion Detected!',
        description: `You seem ${data.dominantEmotion} (${data.confidence}% confidence)`,
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to detect emotion';
      setError(message);
      toast({ title: 'Detection Failed', description: message, variant: 'destructive' });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const reset = useCallback(() => {
    setEmotionResult(null);
    setError(null);
    setFaceDetectionError(null);
  }, []);

  return {
    detectEmotion,
    detectTextEmotion,
    detectVoiceEmotion,
    isProcessing,
    emotionResult,
    error,
    faceDetectionError,
    reset,
  };
};
