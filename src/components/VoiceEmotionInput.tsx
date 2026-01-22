import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceEmotionInputProps {
  onSubmit: (audioBlob: Blob) => void;
  isProcessing: boolean;
}

const VoiceEmotionInput = ({ onSubmit, isProcessing }: VoiceEmotionInputProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        onSubmit(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [onSubmit]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className={cn(
          'w-32 h-32 rounded-full flex items-center justify-center transition-all',
          isRecording
            ? 'bg-destructive/20 animate-pulse'
            : 'bg-primary/10 hover:bg-primary/20'
        )}
      >
        <Button
          size="icon"
          variant={isRecording ? 'destructive' : 'default'}
          className="w-20 h-20 rounded-full"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : isRecording ? (
            <Square className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </Button>
      </div>

      {isRecording && (
        <div className="text-center">
          <p className="text-2xl font-mono text-destructive">{formatTime(recordingTime)}</p>
          <p className="text-sm text-muted-foreground">Recording... Click to stop</p>
        </div>
      )}

      {!isRecording && !isProcessing && (
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Click the microphone and speak about how you're feeling
        </p>
      )}

      {isProcessing && (
        <p className="text-sm text-muted-foreground">Analyzing your voice...</p>
      )}
    </div>
  );
};

export default VoiceEmotionInput;
