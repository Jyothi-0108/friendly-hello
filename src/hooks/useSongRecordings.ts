import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SongRecording {
  id: string;
  user_id: string;
  title: string;
  mood_tag: string | null;
  description: string | null;
  file_url: string;
  file_path: string;
  duration: number | null;
  created_at: string;
}

export const useSongRecordings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recordings, setRecordings] = useState<SongRecording[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchRecordings = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('song_recordings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecordings((data as SongRecording[]) || []);
    } catch (err) {
      console.error('Failed to fetch recordings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const saveRecording = useCallback(async (
    audioBlob: Blob,
    title: string,
    moodTag?: string,
    description?: string,
    durationMs?: number,
  ) => {
    if (!user) return null;
    setIsSaving(true);
    try {
      const fileName = `${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('song-recordings')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('song-recordings')
        .getPublicUrl(fileName);

      const { data, error } = await supabase
        .from('song_recordings')
        .insert({
          user_id: user.id,
          title,
          mood_tag: moodTag || null,
          description: description || null,
          file_url: urlData.publicUrl,
          file_path: fileName,
          duration: durationMs ? Math.round(durationMs / 1000) : null,
        })
        .select()
        .single();

      if (error) throw error;

      setRecordings(prev => [(data as SongRecording), ...prev]);
      toast({ title: 'Recording Saved!', description: `"${title}" has been saved.` });
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save recording';
      toast({ title: 'Save Failed', description: message, variant: 'destructive' });
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [user, toast]);

  const deleteRecording = useCallback(async (recording: SongRecording) => {
    try {
      await supabase.storage.from('song-recordings').remove([recording.file_path]);
      const { error } = await supabase.from('song_recordings').delete().eq('id', recording.id);
      if (error) throw error;
      setRecordings(prev => prev.filter(r => r.id !== recording.id));
      toast({ title: 'Deleted', description: `"${recording.title}" removed.` });
    } catch (err) {
      toast({ title: 'Delete Failed', description: 'Could not delete recording.', variant: 'destructive' });
    }
  }, [toast]);

  return { recordings, isLoading, isSaving, saveRecording, deleteRecording, fetchRecordings };
};
