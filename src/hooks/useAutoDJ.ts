import { useState, useRef, useCallback, useEffect } from 'react';

interface Track {
  id: string;
  name: string;
  artists: string;
  previewUrl: string | null;
  albumArt: string | null;
}

interface AutoDJOptions {
  onCapture: (imageBase64: string) => Promise<void>;
  onPlayTrack: (track: Track) => void;
  tracks: Track[];
  isPlaying: boolean;
  currentTrackId?: string;
  enabled: boolean;
}

export const useAutoDJ = ({
  onCapture,
  onPlayTrack,
  tracks,
  isPlaying,
  currentTrackId,
  enabled,
}: AutoDJOptions) => {
  const [isAutoDJActive, setIsAutoDJActive] = useState(false);
  const [nextCaptureIn, setNextCaptureIn] = useState(0);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentTrackIndexRef = useRef(0);

  const CAPTURE_INTERVAL = 30000; // 30 seconds between mood checks

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    await onCapture(imageBase64);
  }, [onCapture]);

  const startAutoDJ = useCallback(async () => {
    if (isAutoDJActive) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      
      if (!videoRef.current) {
        videoRef.current = document.createElement('video');
        videoRef.current.autoplay = true;
        videoRef.current.playsInline = true;
      }
      
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      
      setIsAutoDJActive(true);
      setNextCaptureIn(CAPTURE_INTERVAL / 1000);

      // Initial capture
      setTimeout(() => captureFrame(), 1000);

      // Set up periodic captures
      captureIntervalRef.current = setInterval(() => {
        captureFrame();
        setNextCaptureIn(CAPTURE_INTERVAL / 1000);
      }, CAPTURE_INTERVAL);

      // Countdown timer
      countdownIntervalRef.current = setInterval(() => {
        setNextCaptureIn((prev) => Math.max(0, prev - 1));
      }, 1000);

    } catch (error) {
      console.error('Failed to start Auto-DJ:', error);
    }
  }, [isAutoDJActive, captureFrame]);

  const stopAutoDJ = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    setIsAutoDJActive(false);
    setNextCaptureIn(0);
  }, []);

  // Auto-advance to next track when current ends or no track playing
  useEffect(() => {
    if (!isAutoDJActive || !enabled) return;
    if (tracks.length === 0) return;

    // If not playing and we have tracks, play the next one
    if (!isPlaying && tracks.length > 0) {
      const currentIndex = tracks.findIndex(t => t.id === currentTrackId);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % tracks.length : 0;
      
      if (tracks[nextIndex]?.previewUrl) {
        setTimeout(() => {
          onPlayTrack(tracks[nextIndex]);
          currentTrackIndexRef.current = nextIndex;
        }, 1500); // Small delay between tracks
      }
    }
  }, [isPlaying, tracks, currentTrackId, isAutoDJActive, enabled, onPlayTrack]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoDJ();
    };
  }, [stopAutoDJ]);

  const toggleAutoDJ = useCallback(() => {
    if (isAutoDJActive) {
      stopAutoDJ();
    } else {
      startAutoDJ();
    }
  }, [isAutoDJActive, startAutoDJ, stopAutoDJ]);

  return {
    isAutoDJActive,
    nextCaptureIn,
    toggleAutoDJ,
    startAutoDJ,
    stopAutoDJ,
  };
};
