import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map emotions to YouTube search queries — mood-improvement strategy
const emotionToSearchTerms: Record<string, string[]> = {
  happy: ["happy mood music video", "feel good songs video", "upbeat dance video"],
  sad: ["uplifting motivational video", "feel good happy songs video", "cheerful music video"],
  angry: ["calming relaxing music video", "positive vibes music video", "energetic dance video"],
  fear: ["calming peaceful music video", "soothing relaxation video", "hopeful music video"],
  surprise: ["exciting music video", "trending music video", "vibrant pop music video"],
  disgust: ["fresh positive music video", "uplifting soul music video", "feel good video"],
  neutral: ["chill lofi music video", "relaxing ambient music video", "calm vibes video"],
};

// Language-specific search modifiers
const languageSearchModifiers: Record<string, string> = {
  english: "",
  hindi: "Bollywood Hindi",
  telugu: "Telugu Tollywood",
  all: "",
};

interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  publishedAt: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emotion, language = "all" } = await req.json();

    if (!emotion) {
      return new Response(
        JSON.stringify({ error: "No emotion provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
    if (!YOUTUBE_API_KEY) {
      console.error("YouTube API key not configured");
      return new Response(
        JSON.stringify({ error: "YouTube is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emotionLower = emotion.toLowerCase();
    const searchTerms = emotionToSearchTerms[emotionLower] || emotionToSearchTerms.neutral;
    const langModifier = languageSearchModifiers[language?.toLowerCase()] || "";

    const allVideos: YouTubeVideo[] = [];
    const seenIds = new Set<string>();

    // Search with up to 2 keywords to get variety
    for (const keyword of searchTerms.slice(0, 2)) {
      try {
        const query = langModifier ? `${langModifier} ${keyword}` : keyword;
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=5&key=${YOUTUBE_API_KEY}`;

        const response = await fetch(url);
        if (!response.ok) {
          const errText = await response.text();
          console.error("YouTube API error:", response.status, errText);
          continue;
        }

        const data = await response.json();
        for (const item of data.items || []) {
          const videoId = item.id?.videoId;
          if (videoId && !seenIds.has(videoId)) {
            seenIds.add(videoId);
            allVideos.push({
              id: videoId,
              title: item.snippet.title,
              channelTitle: item.snippet.channelTitle,
              thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
              publishedAt: item.snippet.publishedAt,
            });
          }
        }
      } catch (err) {
        console.error("YouTube search error:", err);
      }
    }

    // Shuffle and take top 8
    const shuffled = allVideos.sort(() => Math.random() - 0.5);
    const selectedVideos = shuffled.slice(0, 8);

    return new Response(
      JSON.stringify({
        emotion: emotionLower,
        language: language?.toLowerCase() || "all",
        videos: selectedVideos,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-youtube-recommendations:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
