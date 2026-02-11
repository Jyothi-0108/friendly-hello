import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Play, Pause, Save, Trash2, Clock, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useSongRecordings, SongRecording } from '@/hooks/useSongRecordings';

const moodOptions = ['happy', 'sad', 'angry', 'neutral', 'surprise', 'fear', 'romantic', 'energetic', 'chill'];

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const SingAndStore = () => {
  const { recordings, isLoading, isSaving, saveRecording, deleteRecording } = useSongRecordings();

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [moodTag, setMoodTag] = useState('');
  const [description, setDescription] = useState('');

  // Playback state for saved recordings
  const [playingId, setPlayingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; }
      if (playbackAudioRef.current) { playbackAudioRef.current.pause(); playbackAudioRef.current = null; }
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      setRecordedBlob(null);
      setRecordedUrl(null);

      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      console.error('Microphone access denied');
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const togglePreview = useCallback(() => {
    if (!recordedUrl) return;
    if (isPreviewPlaying) {
      previewAudioRef.current?.pause();
      setIsPreviewPlaying(false);
    } else {
      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio(recordedUrl);
        previewAudioRef.current.onended = () => setIsPreviewPlaying(false);
      }
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current.play();
      setIsPreviewPlaying(true);
    }
  }, [recordedUrl, isPreviewPlaying]);

  const handleSave = useCallback(async () => {
    if (!recordedBlob || !title.trim()) return;
    await saveRecording(recordedBlob, title.trim(), moodTag, description, recordingTime * 1000);
    // Reset form
    setTitle('');
    setMoodTag('');
    setDescription('');
    setRecordedBlob(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordingTime(0);
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; }
    setIsPreviewPlaying(false);
  }, [recordedBlob, title, moodTag, description, recordingTime, saveRecording, recordedUrl]);

  const togglePlayback = useCallback((recording: SongRecording) => {
    if (playingId === recording.id) {
      playbackAudioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (playbackAudioRef.current) playbackAudioRef.current.pause();
    const audio = new Audio(recording.file_url);
    audio.onended = () => setPlayingId(null);
    audio.play();
    playbackAudioRef.current = audio;
    setPlayingId(recording.id);
  }, [playingId]);

  return (
    <div className="space-y-6">
      {/* Recorder */}
      <div className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Music2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Record Your Song</h3>
            <p className="text-xs text-muted-foreground">Sing, hum, or freestyle — then save it!</p>
          </div>
        </div>

        {/* Record Button */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg",
              isRecording
                ? "bg-destructive animate-pulse shadow-destructive/40"
                : "bg-primary hover:bg-primary/90 shadow-primary/30"
            )}
          >
            {isRecording ? (
              <Square className="w-8 h-8 text-white fill-white" />
            ) : (
              <Mic className="w-8 h-8 text-primary-foreground" />
            )}
          </button>
          <span className="text-sm text-muted-foreground font-mono">
            {isRecording ? `Recording... ${formatDuration(recordingTime)}` : recordedBlob ? `Recorded ${formatDuration(recordingTime)}` : 'Tap to record'}
          </span>
        </div>

        {/* Preview & Form */}
        {recordedBlob && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={togglePreview} className="gap-2">
                {isPreviewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPreviewPlaying ? 'Pause' : 'Preview'}
              </Button>
              <Button variant="ghost" size="sm" onClick={startRecording} className="gap-2 text-muted-foreground">
                <Mic className="w-4 h-4" /> Re-record
              </Button>
            </div>

            <Input
              placeholder="Song title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background"
            />

            <Select value={moodTag} onValueChange={setMoodTag}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Mood tag (optional)" />
              </SelectTrigger>
              <SelectContent>
                {moodOptions.map(m => (
                  <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="bg-background resize-none"
            />

            <Button
              onClick={handleSave}
              disabled={!title.trim() || isSaving}
              className="w-full gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Recording'}
            </Button>
          </div>
        )}
      </div>

      {/* Saved Recordings List */}
      <div className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground">My Recordings</h3>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recordings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No recordings yet. Sing something!</p>
        ) : (
          <div className="space-y-3">
            {recordings.map((rec) => (
              <div
                key={rec.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  playingId === rec.id ? "border-primary bg-primary/5" : "border-border bg-background/50 hover:border-primary/30"
                )}
              >
                <button
                  onClick={() => togglePlayback(rec)}
                  className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 hover:bg-primary/30 transition-colors"
                >
                  {playingId === rec.id ? (
                    <Pause className="w-4 h-4 text-primary" />
                  ) : (
                    <Play className="w-4 h-4 text-primary" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground text-sm truncate">{rec.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {rec.mood_tag && (
                      <span className="capitalize px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">{rec.mood_tag}</span>
                    )}
                    {rec.duration && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(rec.duration)}</span>
                    )}
                    <span>{new Date(rec.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => deleteRecording(rec)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SingAndStore;
