import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEmotionTheme } from '@/contexts/EmotionThemeContext';
import { Button } from '@/components/ui/button';
import { Music, LogOut, RotateCcw, Camera, Mic, Video } from 'lucide-react';
import WebcamCapture from '@/components/WebcamCapture';
import EmotionDisplay from '@/components/EmotionDisplay';
import MultiFaceEmotionDisplay from '@/components/MultiFaceEmotionDisplay';
import SongRecommendations from '@/components/SongRecommendations';
import VideoRecommendations from '@/components/VideoRecommendations';
import MultiFaceRecommendations from '@/components/MultiFaceRecommendations';
import MiniPlayer from '@/components/MiniPlayer';
import EmotionChatbot from '@/components/EmotionChatbot';
import VoiceEmotionInput from '@/components/VoiceEmotionInput';
import AutoDJControl from '@/components/AutoDJControl';
import SavePlaylistDialog from '@/components/SavePlaylistDialog';
import PlaylistsDrawer from '@/components/PlaylistsDrawer';
import EmotionParticles from '@/components/EmotionParticles';
import LanguageSelector, { SongLanguage } from '@/components/LanguageSelector';
import { useEmotionDetection } from '@/hooks/useEmotionDetection';
import { useSpotifyRecommendations } from '@/hooks/useSpotifyRecommendations';
import { useYouTubeRecommendations } from '@/hooks/useYouTubeRecommendations';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useHistory } from '@/hooks/useHistory';
import { useAutoDJ } from '@/hooks/useAutoDJ';
import { usePlaylists } from '@/hooks/usePlaylists';
import { cn } from '@/lib/utils';

type DetectionMode = 'chat' | 'camera' | 'voice';
type RecommendationType = 'songs' | 'videos';

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
  const [recommendationType, setRecommendationType] = useState<RecommendationType>('songs');
  const [selectedLanguage, setSelectedLanguage] = useState<SongLanguage>('all');
  const songsSectionRef = useRef<HTMLDivElement | null>(null);
  
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
    getRecommendations: getSpotifyRecommendations, 
    isLoading: isLoadingSongs, 
    recommendations: songRecommendations, 
    reset: resetSongs 
  } = useSpotifyRecommendations();

  const {
    getRecommendations: getYouTubeRecommendations,
    isLoading: isLoadingVideos,
    recommendations: videoRecommendations,
    reset: resetVideos,
  } = useYouTubeRecommendations();

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

  const hasAnySongs = (songRecommendations?.tracks?.length ?? 0) > 0 || faceRecommendations.some(f => (f.tracks?.length ?? 0) > 0);
  const hasAnyVideos = (videoRecommendations?.videos?.length ?? 0) > 0;
  const hasAnyResults = hasAnySongs || hasAnyVideos;

  // When results arrive, scroll into view
  useEffect(() => {
    if (!hasAnyResults) return;
    songsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hasAnyResults]);

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

  // Fetch recommendations based on type
  const fetchRecommendations = useCallback(async (emotion: string) => {
    if (recommendationType === 'songs') {
      await getSpotifyRecommendations(emotion, selectedLanguage);
    } else {
      await getYouTubeRecommendations(emotion, selectedLanguage);
    }
  }, [recommendationType, selectedLanguage, getSpotifyRecommendations, getYouTubeRecommendations]);

  const handleCapture = useCallback(async (imageBase64: string) => {
    const result = await detectEmotion(imageBase64);
    if (result) {
      const primaryFace = result.faces?.[0];
      const primaryEmotion = result.dominantEmotion || primaryFace?.dominantEmotion || 'neutral';
      const primaryConfidence = result.confidence ?? primaryFace?.confidence ?? 0;
      const primaryEmotions = (result.emotions && result.emotions.length > 0)
        ? result.emotions
        : (primaryFace?.emotions || []);

      setCurrentEmotion(primaryEmotion);
      
      await saveEmotionHistory({
        detectionMode: 'camera',
        dominantEmotion: primaryEmotion,
        confidence: primaryConfidence,
        emotions: primaryEmotions,
      });

      // Handle multi-face detection (songs only)
      if (result.faceCount > 1 && result.faces && result.faces.length > 1 && recommendationType === 'songs') {
        const initialRecs: FaceRecommendations[] = result.faces.map((face: { faceId: number; dominantEmotion: string }) => ({
          faceId: face.faceId,
          emotion: face.dominantEmotion,
          tracks: [],
          isLoading: true,
        }));
        setFaceRecommendations(initialRecs);
        setSelectedFaceId(result.faces[0].faceId);

        const uniqueEmotions = [...new Set(result.faces.map((f: { dominantEmotion: string }) => f.dominantEmotion))];
        const emotionToTracks: Record<string, typeof initialRecs[0]['tracks']> = {};

        await Promise.all(
          uniqueEmotions.map(async (emotion: string) => {
            const recs = await getSpotifyRecommendations(emotion, selectedLanguage);
            if (recs?.tracks) {
              emotionToTracks[emotion] = recs.tracks;
            }
          })
        );

        setFaceRecommendations(prev => 
          prev.map(rec => ({
            ...rec,
            tracks: emotionToTracks[rec.emotion] || [],
            isLoading: false,
          }))
        );
      } else {
        setFaceRecommendations([]);
        await fetchRecommendations(primaryEmotion);
      }
    }
  }, [detectEmotion, getSpotifyRecommendations, saveEmotionHistory, selectedLanguage, recommendationType, fetchRecommendations]);

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
    await fetchRecommendations(result.dominantEmotion);
  }, [fetchRecommendations, saveEmotionHistory]);

  const handleVoiceSubmit = useCallback(async (audioBlob: Blob) => {
    const result = await detectVoiceEmotion(audioBlob);
    if (result?.dominantEmotion) {
      setCurrentEmotion(result.dominantEmotion);
      setFaceRecommendations([]);
      await saveEmotionHistory({
        detectionMode: 'voice',
        dominantEmotion: result.dominantEmotion,
        confidence: result.confidence,
        emotions: result.emotions,
        transcribedText: result.transcribedText,
      });
      await fetchRecommendations(result.dominantEmotion);
    }
  }, [detectVoiceEmotion, fetchRecommendations, saveEmotionHistory]);

  const handleReset = useCallback(() => {
    resetEmotion();
    resetSongs();
    resetVideos();
    stop();
    setCurrentEmotion(null);
    setSelectedFaceId(null);
    setFaceRecommendations([]);
    setTheme(null);
  }, [resetEmotion, resetSongs, resetVideos, stop, setTheme]);

  const handlePlayTrack = useCallback((track: { id: string; name: string; artists: string; previewUrl: string | null; albumArt: string | null; album?: string; spotifyUrl?: string }, emotion?: string) => {
    play(track);
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
    tracks: songRecommendations?.tracks || [],
    isPlaying,
    currentTrackId: currentTrack?.id,
    enabled: detectionMode === 'camera',
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isLoadingRecommendations = isLoadingSongs || isLoadingVideos;

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
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Professional layered background */}
      <div className="absolute inset-0 bg-professional" />
      <div className="absolute inset-0 bg-grid-pattern" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="absolute inset-0 bg-vignette pointer-events-none" />
      <EmotionParticles emotion={currentEmotion} isAnimating={isAnimating} />

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

      {/* Main content */}
      <main className="relative z-10 px-4 pb-32 max-w-4xl mx-auto space-y-6">
        {/* Mode Switcher + Language + Recommendation Type */}
        <div className="flex flex-col gap-3 bg-card/50 backdrop-blur-sm rounded-xl border border-border p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Detection Mode */}
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
            
            <div className="flex items-center gap-2 flex-wrap">
              <LanguageSelector value={selectedLanguage} onChange={setSelectedLanguage} />
              
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
          </div>

          {/* Recommendation Type Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">Show:</span>
            <button
              onClick={() => setRecommendationType('songs')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm",
                recommendationType === 'songs'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground"
              )}
            >
              <Music className="w-4 h-4" />
              Songs
            </button>
            <button
              onClick={() => setRecommendationType('videos')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm",
                recommendationType === 'videos'
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground"
              )}
            >
              <Video className="w-4 h-4" />
              Videos
            </button>
          </div>
        </div>

        {/* Detection Section */}
        <section className="space-y-4">
          {detectionMode === 'camera' && (
            <>
              {!isAutoDJActive ? (
                <WebcamCapture 
                  onCapture={handleCapture} 
                  isProcessing={isProcessing}
                  faceDetected={emotionResult?.faceDetected === true}
                  faceDetectionError={faceDetectionError}
                />
              ) : (
                <div className="p-6 rounded-2xl border border-border bg-card/50 backdrop-blur text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full emotion-gradient flex items-center justify-center animate-pulse emotion-glow">
                    <Music className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold mb-1">Auto-DJ Active</h3>
                  <p className="text-xs text-muted-foreground">Monitoring your mood continuously</p>
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
            </>
          )}
          
          {detectionMode === 'voice' && (
            <>
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
            </>
          )}
        </section>

        {/* Recommendations Section */}
        <section ref={songsSectionRef} className="bg-card/30 backdrop-blur-sm rounded-xl border border-border p-4">
          {recommendationType === 'songs' ? (
            // Songs view
            isMultiFace && faceRecommendations.length > 0 ? (
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
            ) : (isLoadingSongs || songRecommendations) ? (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <SavePlaylistDialog
                    tracks={songRecommendations?.tracks || []}
                    emotion={songRecommendations?.emotion || emotionResult?.dominantEmotion || 'unknown'}
                    onSave={savePlaylist}
                    isSaving={isSaving}
                  />
                </div>
                <SongRecommendations
                  tracks={songRecommendations?.tracks || []}
                  emotion={songRecommendations?.emotion || emotionResult?.dominantEmotion || ''}
                  isLoading={isLoadingSongs}
                  currentTrackId={currentTrack?.id}
                  isPlaying={isPlaying}
                  onPlayTrack={handlePlayTrack}
                />
              </div>
            ) : (
              <div className="py-12 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                    <Music className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Your Songs</h3>
                  <p className="text-sm text-muted-foreground">Detect your emotion and songs will appear here!</p>
                </div>
              </div>
            )
          ) : (
            // Videos view
            (isLoadingVideos || videoRecommendations) ? (
              <VideoRecommendations
                videos={videoRecommendations?.videos || []}
                emotion={videoRecommendations?.emotion || emotionResult?.dominantEmotion || ''}
                isLoading={isLoadingVideos}
              />
            ) : (
              <div className="py-12 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
                    <Video className="w-7 h-7 text-destructive" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Your Videos</h3>
                  <p className="text-sm text-muted-foreground">Detect your emotion and YouTube videos will appear here!</p>
                </div>
              </div>
            )
          )}
        </section>
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
