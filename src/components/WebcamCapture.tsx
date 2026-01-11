import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';

interface WebcamCaptureProps {
  onCapture: (imageBase64: string) => void;
  isProcessing: boolean;
}

const WebcamCapture = ({ onCapture, isProcessing }: WebcamCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);

      if (!window.isSecureContext) {
        setError('Camera requires a secure (HTTPS) connection.');
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });

      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.srcObject = stream;
        // Mark streaming immediately so the <video> renders.
        setIsStreaming(true);

        // Some browsers need metadata before play works.
        videoEl.onloadedmetadata = () => {
          videoEl.play().catch(() => {
            // If autoplay is blocked, user will still see the video frame once it loads.
          });
        };
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please ensure you have granted camera permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
      setIsStreaming(false);
    }
  }, []);

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
    onCapture(imageBase64);
  }, [onCapture]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden bg-card border border-border shadow-lg">
        {isStreaming ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-muted/50">
            <Camera className="w-16 h-16 text-muted-foreground" />
            <p className="text-muted-foreground text-center px-4">
              {error || 'Click "Start Camera" to begin emotion detection'}
            </p>
          </div>
        )}
        
        {isProcessing && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Analyzing emotion...</p>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex gap-3">
        {!isStreaming ? (
          <Button onClick={startCamera} className="gap-2 gradient-primary">
            <Camera className="w-4 h-4" />
            Start Camera
          </Button>
        ) : (
          <>
            <Button 
              onClick={captureImage} 
              disabled={isProcessing}
              className="gap-2 gradient-primary"
            >
              <Camera className="w-4 h-4" />
              Detect Emotion
            </Button>
            <Button 
              variant="outline" 
              onClick={stopCamera}
              disabled={isProcessing}
              className="gap-2"
            >
              <CameraOff className="w-4 h-4" />
              Stop
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default WebcamCapture;
