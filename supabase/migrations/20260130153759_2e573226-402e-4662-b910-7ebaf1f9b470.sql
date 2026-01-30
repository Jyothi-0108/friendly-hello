-- Create playlists table for saving mood-based playlists
CREATE TABLE public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  emotion TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create playlist_tracks table for storing tracks in playlists
CREATE TABLE public.playlist_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artists TEXT NOT NULL,
  album TEXT,
  album_art TEXT,
  preview_url TEXT,
  spotify_url TEXT,
  duration INTEGER,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on playlists
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- Enable RLS on playlist_tracks
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Policies for playlists table
CREATE POLICY "Users can view their own playlists" 
ON public.playlists 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own playlists" 
ON public.playlists 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists" 
ON public.playlists 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists" 
ON public.playlists 
FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for playlist_tracks table
CREATE POLICY "Users can view tracks in their playlists" 
ON public.playlist_tracks 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.playlists 
    WHERE playlists.id = playlist_tracks.playlist_id 
    AND playlists.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add tracks to their playlists" 
ON public.playlist_tracks 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.playlists 
    WHERE playlists.id = playlist_tracks.playlist_id 
    AND playlists.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete tracks from their playlists" 
ON public.playlist_tracks 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.playlists 
    WHERE playlists.id = playlist_tracks.playlist_id 
    AND playlists.user_id = auth.uid()
  )
);