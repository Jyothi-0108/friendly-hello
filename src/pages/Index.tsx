import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Music, LogOut, RotateCcw } from 'lucide-react';
import WebcamCapture from '@/components/WebcamCapture';
import EmotionDisplay from '@/components/EmotionDisplay';
import SongRecommendations from '@/components/SongRecommendations';
import MiniPlayer from '@/components/MiniPlayer';
import { useEmotionDetection } from '@/hooks/useEmotionDetection';
import { useSpotifyRecommendations } from '@/hooks/useSpotifyRecommendations';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  
  const { 
    detectEmotion, 
    isProcessing, 
    emotionResult, 
    reset: resetEmotion 
  } = useEmotionDetection();
  
  const { 
    getRecommendations, 
    isLoading: isLoadingRecommendations, 
    recommendations, 
    reset: resetRecommendations 
  } = useSpotifyRecommendations();

  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    play,
    stop,
  } = useAudioPlayer();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleCapture = useCallback(async (imageBase64: string) => {
    const result = await detectEmotion(imageBase64);
    if (result?.dominantEmotion) {
      await getRecommendations(result.dominantEmotion);
    }
  }, [detectEmotion, getRecommendations]);

  const handleReset = useCallback(() => {
    resetEmotion();
    resetRecommendations();
    stop();
  }, [resetEmotion, resetRecommendations, stop]);

  const handlePlayTrack = useCallback((track: { id: string; name: string; artists: string; previewUrl: string | null; albumArt: string | null }) => {
    play(track);
  }, [play]);

  const handlePlayerPlayPause = useCallback(() => {
    if (currentTrack) {
      play(currentTrack);
    }
  }, [currentTrack, play]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full gradient-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Music className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-gradient">Feel the Beat</h1>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <span className="text-muted-foreground text-xs md:text-sm hidden sm:inline">
            {user.email}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center py-6 md:py-10 px-4 gap-8">
        {/* Title section */}
        <div className="text-center max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            {emotionResult ? (
              <>Your Mood: <span className="text-gradient capitalize">{emotionResult.dominantEmotion}</span></>
            ) : (
              <>Detect Your <span className="text-gradient">Emotion</span></>
            )}
          </h2>
          <p className="text-muted-foreground">
            {emotionResult 
              ? "Here are personalized song recommendations based on your detected emotion"
              : "Let us analyze your expression and recommend the perfect music for your mood"
            }
          </p>
        </div>

        {/* Webcam and Emotion Detection */}
        <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start w-full max-w-5xl">
          <div className="flex flex-col items-center gap-4">
            <WebcamCapture 
              onCapture={handleCapture} 
              isProcessing={isProcessing}
              faceDetected={!!emotionResult}
            />
            
            {emotionResult && (
              <Button 
                variant="outline" 
                onClick={handleReset}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Detect Again
              </Button>
            )}
          </div>

          {/* Emotion Display */}
          {emotionResult && (
            <EmotionDisplay
              dominantEmotion={emotionResult.dominantEmotion}
              confidence={emotionResult.confidence}
              allEmotions={emotionResult.emotions}
            />
          )}
        </div>

        {/* Song Recommendations */}
        {(isLoadingRecommendations || recommendations) && (
          <SongRecommendations
            tracks={recommendations?.tracks || []}
            emotion={recommendations?.emotion || emotionResult?.dominantEmotion || ''}
            isLoading={isLoadingRecommendations}
            currentTrackId={currentTrack?.id}
            isPlaying={isPlaying}
            onPlayTrack={handlePlayTrack}
          />
        )}
      </main>

      {/* Mini Player */}
      <MiniPlayer
        track={currentTrack}
        isPlaying={isPlaying}
        progress={progress}
        duration={duration}
        onPlayPause={handlePlayerPlayPause}
        onClose={stop}
      />
    </div>
  );
};

export default Index;
