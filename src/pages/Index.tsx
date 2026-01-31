import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEmotionTheme } from '@/contexts/EmotionThemeContext';
import { Button } from '@/components/ui/button';
import { Music, LogOut, RotateCcw, Camera, Mic } from 'lucide-react';
import WebcamCapture from '@/components/WebcamCapture';
import EmotionDisplay from '@/components/EmotionDisplay';
import MultiFaceEmotionDisplay from '@/components/MultiFaceEmotionDisplay';
import SongRecommendations from '@/components/SongRecommendations';
import MultiFaceRecommendations from '@/components/MultiFaceRecommendations';
import MiniPlayer from '@/components/MiniPlayer';
import EmotionChatbot from '@/components/EmotionChatbot';
import VoiceEmotionInput from '@/components/VoiceEmotionInput';
import AutoDJControl from '@/components/AutoDJControl';
import SavePlaylistDialog from '@/components/SavePlaylistDialog';
import PlaylistsDrawer from '@/components/PlaylistsDrawer';
import EmotionParticles from '@/components/EmotionParticles';
import { useEmotionDetection } from '@/hooks/useEmotionDetection';
import { useSpotifyRecommendations } from '@/hooks/useSpotifyRecommendations';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useHistory } from '@/hooks/useHistory';
import { useAutoDJ } from '@/hooks/useAutoDJ';
import { usePlaylists } from '@/hooks/usePlaylists';
import { cn } from '@/lib/utils';

type DetectionMode = 'chat' | 'camera' | 'voice';

interface FaceRecommendations {
  faceId: number;
  emotion: string;
  tracks: Array<{
    id: string;
    name: string;
    artists: string;
    album: string;
    albumArt: string | null;
    previewUrl: string | null;
    spotifyUrl: string;
    duration: number;
  }>;
  isLoading: boolean;
}

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { setTheme, isAnimating } = useEmotionTheme();
  const [detectionMode, setDetectionMode] = useState<DetectionMode>('chat');
  
  const { 
    detectEmotion, 
    detectTextEmotion,
    detectVoiceEmotion,
    isProcessing, 
    emotionResult,
    faceDetectionError,
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
    volume,
    isMuted,
    play,
    stop,
    seek,
    setVolume,
    toggleMute,
  } = useAudioPlayer();

  const { saveEmotionHistory, savePlayHistory } = useHistory();
  const { playlists, isLoading: isLoadingPlaylists, isSaving, fetchPlaylists, savePlaylist, deletePlaylist } = usePlaylists();
  const [currentEmotion, setCurrentEmotion] = useState<string | null>(null);
  
  // Multi-face state
  const [selectedFaceId, setSelectedFaceId] = useState<number | null>(null);
  const [faceRecommendations, setFaceRecommendations] = useState<FaceRecommendations[]>([]);

  const isMultiFace = emotionResult?.faceCount && emotionResult.faceCount > 1 && emotionResult.faces;

  // Update theme when emotion changes
  useEffect(() => {
    if (currentEmotion) {
      setTheme(currentEmotion.toLowerCase() as any);
    }
  }, [currentEmotion, setTheme]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // When faces are detected, auto-select the first one
  useEffect(() => {
    if (emotionResult?.faces && emotionResult.faces.length > 0 && selectedFaceId === null) {
      setSelectedFaceId(emotionResult.faces[0].faceId);
    }
  }, [emotionResult?.faces, selectedFaceId]);

  const handleCapture = useCallback(async (imageBase64: string) => {
    const result = await detectEmotion(imageBase64);
    if (result?.dominantEmotion) {
      setCurrentEmotion(result.dominantEmotion);
      
      // Save emotion history for primary face
      await saveEmotionHistory({
        detectionMode: 'camera',
        dominantEmotion: result.dominantEmotion,
        confidence: result.confidence,
        emotions: result.emotions,
      });

      // Handle multi-face detection
      if (result.faceCount > 1 && result.faces && result.faces.length > 1) {
        // Initialize loading state for all faces
        const initialRecs: FaceRecommendations[] = result.faces.map((face: { faceId: number; dominantEmotion: string }) => ({
          faceId: face.faceId,
          emotion: face.dominantEmotion,
          tracks: [],
          isLoading: true,
        }));
        setFaceRecommendations(initialRecs);
        setSelectedFaceId(result.faces[0].faceId);

        // Fetch recommendations for each face in parallel
        const uniqueEmotions = [...new Set(result.faces.map((f: { dominantEmotion: string }) => f.dominantEmotion))];
        const emotionToTracks: Record<string, typeof initialRecs[0]['tracks']> = {};

        await Promise.all(
          uniqueEmotions.map(async (emotion: string) => {
            const recs = await getRecommendations(emotion);
            if (recs?.tracks) {
              emotionToTracks[emotion] = recs.tracks;
            }
          })
        );

        // Update face recommendations with fetched tracks
        setFaceRecommendations(prev => 
          prev.map(rec => ({
            ...rec,
            tracks: emotionToTracks[rec.emotion] || [],
            isLoading: false,
          }))
        );
      } else {
        // Single face - use existing flow
        setFaceRecommendations([]);
        await getRecommendations(result.dominantEmotion);
      }
    }
  }, [detectEmotion, getRecommendations, saveEmotionHistory]);

  const handleChatEmotionDetected = useCallback(async (
    result: { dominantEmotion: string; confidence: number; emotions: Array<{ emotion: string; confidence: number }> },
    userText: string
  ) => {
    setCurrentEmotion(result.dominantEmotion);
    setFaceRecommendations([]);
    await saveEmotionHistory({
      detectionMode: 'text',
      dominantEmotion: result.dominantEmotion,
      confidence: result.confidence,
      emotions: result.emotions,
      transcribedText: userText,
    });
    await getRecommendations(result.dominantEmotion);
  }, [getRecommendations, saveEmotionHistory]);

  const handleVoiceSubmit = useCallback(async (audioBlob: Blob) => {
    const result = await detectVoiceEmotion(audioBlob);
    if (result?.dominantEmotion) {
      setCurrentEmotion(result.dominantEmotion);
      setFaceRecommendations([]); // Clear multi-face state for voice mode
      await saveEmotionHistory({
        detectionMode: 'voice',
        dominantEmotion: result.dominantEmotion,
        confidence: result.confidence,
        emotions: result.emotions,
        transcribedText: result.transcribedText,
      });
      await getRecommendations(result.dominantEmotion);
    }
  }, [detectVoiceEmotion, getRecommendations, saveEmotionHistory]);

  const handleReset = useCallback(() => {
    resetEmotion();
    resetRecommendations();
    stop();
    setCurrentEmotion(null);
    setSelectedFaceId(null);
    setFaceRecommendations([]);
    setTheme(null);
  }, [resetEmotion, resetRecommendations, stop, setTheme]);

  const handlePlayTrack = useCallback((track: { id: string; name: string; artists: string; previewUrl: string | null; albumArt: string | null; album?: string; spotifyUrl?: string }, emotion?: string) => {
    play(track);
    // Save play history
    savePlayHistory({
      trackId: track.id,
      trackName: track.name,
      artists: track.artists,
      album: track.album,
      albumArt: track.albumArt || undefined,
      spotifyUrl: track.spotifyUrl,
      emotion: emotion || currentEmotion || undefined,
    });
  }, [play, savePlayHistory, currentEmotion]);

  const handlePlayerPlayPause = useCallback(() => {
    if (currentTrack) {
      play(currentTrack);
    }
  }, [currentTrack, play]);

  // Auto-DJ hook
  const { isAutoDJActive, nextCaptureIn, toggleAutoDJ } = useAutoDJ({
    onCapture: handleCapture,
    onPlayTrack: handlePlayTrack,
    tracks: recommendations?.tracks || [],
    isPlaying,
    currentTrackId: currentTrack?.id,
    enabled: detectionMode === 'camera',
  });

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
      {/* Emotion-reactive particles */}
      <EmotionParticles emotion={currentEmotion} isAnimating={isAnimating} />

      {/* Background effects with emotion-reactive colors */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 transition-colors duration-700" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl transition-colors duration-700 emotion-bg-primary opacity-20" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl transition-colors duration-700" style={{ background: 'hsl(var(--emotion-accent) / 0.2)' }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full emotion-gradient flex items-center justify-center shadow-lg emotion-glow transition-all duration-700">
            <Music className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold">
            <span className="emotion-primary transition-colors duration-700">Feel the Beat</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <PlaylistsDrawer
            playlists={playlists}
            isLoading={isLoadingPlaylists}
            onFetch={fetchPlaylists}
            onPlayTrack={handlePlayTrack}
            onDelete={deletePlaylist}
            currentTrackId={currentTrack?.id}
            isPlaying={isPlaying}
          />
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

      {/* Main content - Centered Layout */}
      <main className="relative z-10 flex flex-col h-[calc(100vh-80px)] p-4 gap-4 max-w-5xl mx-auto">
        {/* Mode Switcher for Camera/Voice */}
        <div className="flex items-center justify-between bg-card/50 backdrop-blur-sm rounded-xl border border-border p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDetectionMode('camera')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                detectionMode === 'camera' 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Camera</span>
            </button>
            <button
              onClick={() => setDetectionMode('voice')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                detectionMode === 'voice' 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              <Mic className="w-4 h-4" />
              <span className="hidden sm:inline">Voice</span>
            </button>
          </div>
          
          {/* Auto-DJ Control (only for camera mode) */}
          {detectionMode === 'camera' && (
            <AutoDJControl
              isActive={isAutoDJActive}
              nextCaptureIn={nextCaptureIn}
              onToggle={toggleAutoDJ}
              disabled={isProcessing}
            />
          )}
          
          {emotionResult && !isAutoDJActive && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          )}
        </div>

        {/* Camera/Voice Input - Centered */}
        {detectionMode === 'camera' && (
          <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
            {!isAutoDJActive ? (
              <WebcamCapture 
                onCapture={handleCapture} 
                isProcessing={isProcessing}
                faceDetected={!!emotionResult}
                faceDetectionError={faceDetectionError}
              />
            ) : (
              <div className="w-full max-w-sm p-6 rounded-2xl border border-border bg-card/50 backdrop-blur text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full emotion-gradient flex items-center justify-center animate-pulse emotion-glow">
                  <Music className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Auto-DJ Active</h3>
                <p className="text-xs text-muted-foreground">
                  Monitoring your mood continuously
                </p>
              </div>
            )}
            
            {emotionResult && (
              isMultiFace ? (
                <MultiFaceEmotionDisplay
                  faces={emotionResult.faces!}
                  selectedFaceId={selectedFaceId}
                  onSelectFace={setSelectedFaceId}
                />
              ) : (
                <EmotionDisplay
                  dominantEmotion={emotionResult.dominantEmotion}
                  confidence={emotionResult.confidence}
                  allEmotions={emotionResult.emotions}
                />
              )
            )}
          </div>
        )}
        
        {detectionMode === 'voice' && (
          <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
            <VoiceEmotionInput
              onSubmit={handleVoiceSubmit}
              isProcessing={isProcessing}
            />
            
            {emotionResult && (
              <EmotionDisplay
                dominantEmotion={emotionResult.dominantEmotion}
                confidence={emotionResult.confidence}
                allEmotions={emotionResult.emotions}
              />
            )}
          </div>
        )}

        {/* Song Recommendations */}
        <div className="flex-1 overflow-auto">
          {isMultiFace && faceRecommendations.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-end">
                <SavePlaylistDialog
                  tracks={faceRecommendations.find(f => f.faceId === selectedFaceId)?.tracks || []}
                  emotion={faceRecommendations.find(f => f.faceId === selectedFaceId)?.emotion || 'mixed'}
                  onSave={savePlaylist}
                  isSaving={isSaving}
                />
              </div>
              <MultiFaceRecommendations
                faceRecommendations={faceRecommendations}
                selectedFaceId={selectedFaceId}
                onSelectFace={setSelectedFaceId}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                onPlayTrack={handlePlayTrack}
              />
            </div>
          ) : (isLoadingRecommendations || recommendations) ? (
            <div className="space-y-4">
              <div className="flex justify-end">
                <SavePlaylistDialog
                  tracks={recommendations?.tracks || []}
                  emotion={recommendations?.emotion || emotionResult?.dominantEmotion || 'unknown'}
                  onSave={savePlaylist}
                  isSaving={isSaving}
                />
              </div>
              <SongRecommendations
                tracks={recommendations?.tracks || []}
                emotion={recommendations?.emotion || emotionResult?.dominantEmotion || ''}
                isLoading={isLoadingRecommendations}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                onPlayTrack={handlePlayTrack}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center p-8 rounded-2xl bg-card/30 backdrop-blur border border-border max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <Music className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Ready for Music</h3>
                <p className="text-sm text-muted-foreground">
                  Click the chat icon in the bottom left to tell me how you're feeling, or use the camera/voice options above. 
                  We'll recommend the perfect songs for how you're feeling!
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Chatbot */}
      <EmotionChatbot
        onEmotionDetected={handleChatEmotionDetected}
        isProcessing={isProcessing || isLoadingRecommendations}
        currentEmotion={currentEmotion}
      />

      {/* Mini Player */}
      <MiniPlayer
        track={currentTrack}
        isPlaying={isPlaying}
        progress={progress}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        onPlayPause={handlePlayerPlayPause}
        onClose={stop}
        onSeek={seek}
        onVolumeChange={setVolume}
        onToggleMute={toggleMute}
      />
    </div>
  );
};

export default Index;
