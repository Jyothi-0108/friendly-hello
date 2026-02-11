
-- Create storage bucket for song recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('song-recordings', 'song-recordings', true);

-- Storage policies
CREATE POLICY "Users can upload their own recordings"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'song-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'song-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own recordings"
ON storage.objects FOR DELETE
USING (bucket_id = 'song-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create song_recordings table
CREATE TABLE public.song_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  mood_tag TEXT,
  description TEXT,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.song_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recordings"
ON public.song_recordings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recordings"
ON public.song_recordings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings"
ON public.song_recordings FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings"
ON public.song_recordings FOR UPDATE
USING (auth.uid() = user_id);
