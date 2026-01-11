import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Camera, CameraOff, RefreshCw, FlipHorizontal, Play, Pause } from 'lucide-react';

interface WebcamCaptureProps {
  onCapture: (imageBase64: string) => void;
  isProcessing: boolean;
}

interface VideoDevice {
  deviceId: string;
  label: string;
}

const AUTO_DETECT_INTERVAL = 5000; // 5 seconds between detections

const WebcamCapture = ({ onCapture, isProcessing }: WebcamCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isMirrored, setIsMirrored] = useState(true);
  const [isAutoDetect, setIsAutoDetect] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Enumerate available video devices
  const enumerateDevices = useCallback(async () => {
    let permissionStream: MediaStream | null = null;

    try {
      if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) return;

      // Request permission first so labels are exposed, then immediately stop that temp stream.
      permissionStream = await navigator.mediaDevices.getUserMedia({ video: true });

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices
        .filter((d) => d.kind === 'videoinput')
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${idx + 1}`,
        }));

      setDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.error('Could not enumerate devices', err);
    } finally {
      permissionStream?.getTracks().forEach((t) => t.stop());
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    enumerateDevices();
  }, [enumerateDevices]);

  const startCamera = useCallback(
    async (overrideDeviceId?: string) => {
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

        // Stop any existing stream before starting a new one
        if (videoRef.current?.srcObject) {
          const oldStream = videoRef.current.srcObject as MediaStream;
          oldStream.getTracks().forEach((track) => track.stop());
          videoRef.current.srcObject = null;
        }

        const deviceIdToUse = overrideDeviceId ?? selectedDeviceId;

        const constraints: MediaStreamConstraints = {
          video: deviceIdToUse
            ? { deviceId: { exact: deviceIdToUse }, width: 640, height: 480 }
            : { facingMode: 'user', width: 640, height: 480 },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
          setIsStreaming(true);

          videoEl.onloadedmetadata = () => {
            videoEl.play().catch(() => {});
          };
        }
      } catch (err: any) {
        console.error('Error accessing camera:', err);
        const name = err?.name as string | undefined;
        if (name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access in your browser settings.');
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setError('No camera device found. Please connect a camera and try again.');
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          setError('Camera is already in use by another app (Zoom/Meet). Close it and try again.');
        } else if (name === 'OverconstrainedError') {
          setError('Selected camera is unavailable. Please choose a different camera.');
        } else {
          setError('Unable to access camera. Please ensure you have granted camera permissions.');
        }
      }
    },
    [selectedDeviceId]
  );

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
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

  // Switch camera while streaming
  const handleDeviceChange = useCallback(
    (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      if (isStreaming) {
        // Restart stream with the newly selected camera
        startCamera(deviceId);
      }
    },
    [isStreaming, startCamera]
  );

  // Auto-detect logic
  useEffect(() => {
    if (isAutoDetect && isStreaming && !isProcessing) {
      // Start countdown and interval
      setCountdown(AUTO_DETECT_INTERVAL / 1000);
      
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) return AUTO_DETECT_INTERVAL / 1000;
          return prev - 1;
        });
      }, 1000);

      intervalRef.current = setInterval(() => {
        captureImage();
      }, AUTO_DETECT_INTERVAL);

      return () => {
        clearInterval(countdownInterval);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setCountdown(null);
      };
    } else {
      // Clear interval when auto-detect is off
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCountdown(null);
    }
  }, [isAutoDetect, isStreaming, isProcessing, captureImage]);

  // Stop auto-detect when camera stops
  useEffect(() => {
    if (!isStreaming) {
      setIsAutoDetect(false);
    }
  }, [isStreaming]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [stopCamera]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Camera selector */}
      {devices.length > 1 && (
        <div className="w-full max-w-md">
          <Select value={selectedDeviceId} onValueChange={handleDeviceChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select camera" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden bg-card border border-border shadow-lg">
        {isStreaming ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={isMirrored ? { transform: 'scaleX(-1)' } : undefined}
            />
            {/* Mirror toggle button */}
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setIsMirrored(!isMirrored)}
              className="absolute top-3 right-3 bg-background/70 hover:bg-background/90 backdrop-blur-sm"
              title={isMirrored ? 'Disable mirror' : 'Enable mirror'}
            >
              <FlipHorizontal className={`w-4 h-4 ${isMirrored ? 'text-primary' : 'text-muted-foreground'}`} />
            </Button>

            {/* Auto-detect countdown indicator */}
            {isAutoDetect && countdown !== null && (
              <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
                Next scan in {countdown}s
              </div>
            )}
          </>
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

      {/* Auto-detect toggle */}
      {isStreaming && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
          <Switch
            id="auto-detect"
            checked={isAutoDetect}
            onCheckedChange={setIsAutoDetect}
            disabled={isProcessing}
          />
          <Label htmlFor="auto-detect" className="flex items-center gap-2 cursor-pointer">
            {isAutoDetect ? (
              <Pause className="w-4 h-4 text-primary" />
            ) : (
              <Play className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm">
              {isAutoDetect ? 'Auto-detect ON' : 'Enable auto-detect'}
            </span>
          </Label>
        </div>
      )}

      <div className="flex gap-3">
        {!isStreaming ? (
          <Button onClick={() => startCamera()} className="gap-2 gradient-primary">
            <Camera className="w-4 h-4" />
            Start Camera
          </Button>
        ) : (
          <>
            <Button
              onClick={captureImage}
              disabled={isProcessing || isAutoDetect}
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
