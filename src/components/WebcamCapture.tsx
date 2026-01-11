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
import { 
  Camera, 
  CameraOff, 
  RefreshCw, 
  FlipHorizontal, 
  Play, 
  Pause, 
  Maximize2, 
  Minimize2,
  Sun,
  User,
  Move,
  CheckCircle2
} from 'lucide-react';

interface WebcamCaptureProps {
  onCapture: (imageBase64: string) => void;
  isProcessing: boolean;
  faceDetected?: boolean;
}

interface VideoDevice {
  deviceId: string;
  label: string;
}

const AUTO_DETECT_INTERVAL = 5000;

const WebcamCapture = ({ onCapture, isProcessing, faceDetected = false }: WebcamCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isMirrored, setIsMirrored] = useState(true);
  const [isAutoDetect, setIsAutoDetect] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGuidance, setShowGuidance] = useState(true);

  // Enumerate available video devices
  const enumerateDevices = useCallback(async () => {
    let permissionStream: MediaStream | null = null;

    try {
      if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) return;

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
    if (isFullscreen) {
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

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

  const handleDeviceChange = useCallback(
    (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      if (isStreaming) {
        startCamera(deviceId);
      }
    },
    [isStreaming, startCamera]
  );

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Auto-detect logic
  useEffect(() => {
    if (isAutoDetect && isStreaming && !isProcessing) {
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
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCountdown(null);
    }
  }, [isAutoDetect, isStreaming, isProcessing, captureImage]);

  useEffect(() => {
    if (!isStreaming) {
      setIsAutoDetect(false);
    }
  }, [isStreaming]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [stopCamera]);

  // Hide guidance after face is detected
  useEffect(() => {
    if (faceDetected) {
      const timer = setTimeout(() => setShowGuidance(false), 2000);
      return () => clearTimeout(timer);
    } else {
      setShowGuidance(true);
    }
  }, [faceDetected]);

  const videoContainerClasses = isFullscreen
    ? 'fixed inset-0 z-50 bg-black flex items-center justify-center'
    : 'relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden bg-card border border-border shadow-lg';

  const videoClasses = isFullscreen
    ? 'max-w-full max-h-full object-contain'
    : 'w-full h-full object-cover';

  return (
    <div className="flex flex-col items-center gap-4" ref={containerRef}>
      {/* Camera selector */}
      {devices.length > 1 && !isFullscreen && (
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

      <div className={videoContainerClasses}>
        {isStreaming ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={videoClasses}
              style={isMirrored ? { transform: 'scaleX(-1)' } : undefined}
            />

            {/* Face guide overlay */}
            {showGuidance && !isProcessing && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Oval face guide */}
                <div 
                  className={`border-2 border-dashed rounded-[50%] transition-colors duration-300 ${
                    faceDetected ? 'border-green-500' : 'border-primary/60'
                  }`}
                  style={{ 
                    width: isFullscreen ? '200px' : '140px', 
                    height: isFullscreen ? '260px' : '180px' 
                  }}
                />
              </div>
            )}

            {/* Face detected indicator */}
            {faceDetected && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-green-500/90 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Face Detected
              </div>
            )}

            {/* Guidance tips */}
            {showGuidance && !faceDetected && !isProcessing && (
              <div className="absolute bottom-3 left-3 right-3 flex flex-wrap justify-center gap-2">
                <div className="bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5">
                  <User className="w-3 h-3 text-primary" />
                  Center your face
                </div>
                <div className="bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5">
                  <Move className="w-3 h-3 text-primary" />
                  Move closer
                </div>
                <div className="bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5">
                  <Sun className="w-3 h-3 text-primary" />
                  Good lighting
                </div>
              </div>
            )}

            {/* Control buttons overlay */}
            <div className="absolute top-3 right-3 flex gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setIsMirrored(!isMirrored)}
                className="bg-background/70 hover:bg-background/90 backdrop-blur-sm"
                title={isMirrored ? 'Disable mirror' : 'Enable mirror'}
              >
                <FlipHorizontal className={`w-4 h-4 ${isMirrored ? 'text-primary' : 'text-muted-foreground'}`} />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={toggleFullscreen}
                className="bg-background/70 hover:bg-background/90 backdrop-blur-sm"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-primary" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>

            {/* Auto-detect countdown indicator */}
            {isAutoDetect && countdown !== null && (
              <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
                Next scan in {countdown}s
              </div>
            )}

            {/* Fullscreen exit hint */}
            {isFullscreen && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-background/70 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-muted-foreground">
                Press ESC to exit fullscreen
              </div>
            )}

            {/* Fullscreen controls */}
            {isFullscreen && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
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
                  className="gap-2 bg-background/70 hover:bg-background/90"
                >
                  <CameraOff className="w-4 h-4" />
                  Stop
                </Button>
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
      {isStreaming && !isFullscreen && (
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

      {!isFullscreen && (
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
      )}
    </div>
  );
};

export default WebcamCapture;
