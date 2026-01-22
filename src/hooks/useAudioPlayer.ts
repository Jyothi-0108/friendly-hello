import { useState, useRef, useCallback, useEffect } from 'react';

interface Track {
  id: string;
  name: string;
  artists: string;
  previewUrl: string | null;
  albumArt: string | null;
}

export const useAudioPlayer = () => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    
    const audio = audioRef.current;
    
    audio.addEventListener('timeupdate', () => {
      setProgress(audio.currentTime);
    });
    
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });
    
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const play = useCallback((track: Track) => {
    if (!track.previewUrl || !audioRef.current) return;
    
    const audio = audioRef.current;
    
    if (currentTrack?.id === track.id) {
      // Toggle play/pause for same track
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
    } else {
      // Play new track
      audio.src = track.previewUrl;
      audio.play();
      setCurrentTrack(track);
      setIsPlaying(true);
      setProgress(0);
    }
  }, [currentTrack, isPlaying]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTrack(null);
      setProgress(0);
    }
  }, []);

  return {
    currentTrack,
    isPlaying,
    progress,
    duration,
    play,
    pause,
    seek,
    stop,
  };
};
