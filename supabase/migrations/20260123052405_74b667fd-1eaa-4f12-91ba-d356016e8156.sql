-- Create emotion_history table
CREATE TABLE public.emotion_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  detection_mode TEXT NOT NULL CHECK (detection_mode IN ('camera', 'text', 'voice')),
  dominant_emotion TEXT NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  emotions JSONB NOT NULL DEFAULT '[]'::jsonb,
  transcribed_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create play_history table  
CREATE TABLE public.play_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artists TEXT NOT NULL,
  album TEXT,
  album_art TEXT,
  spotify_url TEXT,
  emotion TEXT,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.emotion_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.play_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emotion_history
CREATE POLICY "Users can view their own emotion history"
ON public.emotion_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emotion history"
ON public.emotion_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emotion history"
ON public.emotion_history
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for play_history
CREATE POLICY "Users can view their own play history"
ON public.play_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own play history"
ON public.play_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own play history"
ON public.play_history
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for efficient querying
CREATE INDEX idx_emotion_history_user_id ON public.emotion_history(user_id);
CREATE INDEX idx_emotion_history_created_at ON public.emotion_history(created_at DESC);
CREATE INDEX idx_play_history_user_id ON public.play_history(user_id);
CREATE INDEX idx_play_history_played_at ON public.play_history(played_at DESC);