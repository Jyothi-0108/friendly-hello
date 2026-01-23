import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map emotions to Spotify search queries and genres
const emotionToSearchTerms: Record<string, { keywords: string[]; genres: string[] }> = {
  happy: {
    keywords: ["happy", "upbeat", "feel good", "dance", "party"],
    genres: ["pop", "dance", "happy"],
  },
  sad: {
    keywords: ["sad", "heartbreak", "melancholy", "emotional", "ballad"],
    genres: ["acoustic", "indie", "sad"],
  },
  angry: {
    keywords: ["angry", "rage", "intense", "heavy", "aggressive"],
    genres: ["rock", "metal", "punk"],
  },
  fear: {
    keywords: ["dark", "ambient", "atmospheric", "tense", "suspense"],
    genres: ["ambient", "electronic", "soundtrack"],
  },
  surprise: {
    keywords: ["exciting", "energetic", "unexpected", "dynamic", "vibrant"],
    genres: ["electronic", "pop", "indie"],
  },
  disgust: {
    keywords: ["alternative", "grunge", "underground", "raw"],
    genres: ["alternative", "grunge", "punk"],
  },
  neutral: {
    keywords: ["chill", "relaxing", "calm", "peaceful", "ambient"],
    genres: ["chill", "lo-fi", "ambient"],
  },
};

async function getSpotifyAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Spotify auth error:", error);
    throw new Error("Failed to authenticate with Spotify");
  }

  const data = await response.json();
  return data.access_token;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string; height: number }>;
  };
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
  duration_ms: number;
}

async function searchSpotifyTracks(
  accessToken: string,
  query: string,
  limit: number = 10
): Promise<SpotifyTrack[]> {
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Spotify search error:", error);
    throw new Error("Failed to search Spotify");
  }

  const data = await response.json();
  return data.tracks?.items || [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emotion } = await req.json();

    if (!emotion) {
      return new Response(
        JSON.stringify({ error: "No emotion provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID");
    const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET");

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      console.error("Spotify credentials not configured");
      return new Response(
        JSON.stringify({ error: "Spotify is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Spotify access token
    const accessToken = await getSpotifyAccessToken(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);

    // Get search terms for the emotion
    const emotionLower = emotion.toLowerCase();
    const searchConfig = emotionToSearchTerms[emotionLower] || emotionToSearchTerms.neutral;

    // Search for tracks using multiple keywords to get variety
    const allTracks: SpotifyTrack[] = [];
    const seenIds = new Set<string>();

    for (const keyword of searchConfig.keywords.slice(0, 3)) {
      try {
        const query = `${keyword} ${searchConfig.genres[0] || ""}`.trim();
        const tracks = await searchSpotifyTracks(accessToken, query, 5);
        
        for (const track of tracks) {
          if (!seenIds.has(track.id)) {
            seenIds.add(track.id);
            allTracks.push(track);
          }
        }
      } catch (err) {
        console.error(`Search error for keyword "${keyword}":`, err);
      }
    }

    // Shuffle and take top 8 tracks
    const shuffled = allTracks.sort(() => Math.random() - 0.5);
    const selectedTracks = shuffled.slice(0, 8);

    // Format tracks for response
    const formattedTracks = selectedTracks.map((track) => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map((a) => a.name).join(", "),
      album: track.album.name,
      albumArt: track.album.images.find((img) => img.height === 300)?.url ||
                track.album.images[0]?.url || null,
      previewUrl: track.preview_url,
      spotifyUrl: track.external_urls.spotify,
      duration: track.duration_ms,
    }));

    return new Response(
      JSON.stringify({
        emotion: emotionLower,
        genres: searchConfig.genres,
        tracks: formattedTracks,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-spotify-recommendations function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
