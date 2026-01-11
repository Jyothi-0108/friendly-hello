import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map emotions to Spotify audio features and genres
const emotionToMusicParams: Record<string, { 
  genres: string[]; 
  valence: { min: number; max: number };
  energy: { min: number; max: number };
  tempo: { min: number; max: number };
}> = {
  happy: {
    genres: ["pop", "dance", "indie-pop"],
    valence: { min: 0.7, max: 1.0 },
    energy: { min: 0.6, max: 1.0 },
    tempo: { min: 100, max: 140 },
  },
  sad: {
    genres: ["acoustic", "piano", "indie"],
    valence: { min: 0.0, max: 0.3 },
    energy: { min: 0.1, max: 0.4 },
    tempo: { min: 60, max: 100 },
  },
  angry: {
    genres: ["rock", "metal", "punk"],
    valence: { min: 0.2, max: 0.5 },
    energy: { min: 0.7, max: 1.0 },
    tempo: { min: 120, max: 180 },
  },
  fear: {
    genres: ["ambient", "classical", "chill"],
    valence: { min: 0.1, max: 0.4 },
    energy: { min: 0.2, max: 0.5 },
    tempo: { min: 70, max: 110 },
  },
  surprise: {
    genres: ["electronic", "dance", "edm"],
    valence: { min: 0.5, max: 0.9 },
    energy: { min: 0.6, max: 0.9 },
    tempo: { min: 110, max: 150 },
  },
  disgust: {
    genres: ["blues", "soul", "r-n-b"],
    valence: { min: 0.2, max: 0.5 },
    energy: { min: 0.3, max: 0.6 },
    tempo: { min: 80, max: 120 },
  },
  neutral: {
    genres: ["chill", "lo-fi", "jazz"],
    valence: { min: 0.4, max: 0.6 },
    energy: { min: 0.3, max: 0.6 },
    tempo: { min: 80, max: 120 },
  },
};

async function getSpotifyToken(clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error("Failed to get Spotify access token");
  }

  const data = await response.json();
  return data.access_token;
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
      return new Response(
        JSON.stringify({ error: "Spotify credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Spotify access token
    const accessToken = await getSpotifyToken(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);

    // Get music parameters for the emotion
    const emotionLower = emotion.toLowerCase();
    const params = emotionToMusicParams[emotionLower] || emotionToMusicParams.neutral;

    // Build recommendation request
    const seedGenres = params.genres.slice(0, 3).join(",");
    const url = new URL("https://api.spotify.com/v1/recommendations");
    url.searchParams.set("seed_genres", seedGenres);
    url.searchParams.set("min_valence", params.valence.min.toString());
    url.searchParams.set("max_valence", params.valence.max.toString());
    url.searchParams.set("min_energy", params.energy.min.toString());
    url.searchParams.set("max_energy", params.energy.max.toString());
    url.searchParams.set("min_tempo", params.tempo.min.toString());
    url.searchParams.set("max_tempo", params.tempo.max.toString());
    url.searchParams.set("limit", "10");

    const response = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Spotify API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to get recommendations" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Format tracks for response
    const tracks = data.tracks.map((track: any) => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map((a: any) => a.name).join(", "),
      album: track.album.name,
      albumArt: track.album.images[0]?.url || null,
      previewUrl: track.preview_url,
      spotifyUrl: track.external_urls.spotify,
      duration: track.duration_ms,
    }));

    return new Response(
      JSON.stringify({ 
        tracks,
        emotion: emotionLower,
        genres: params.genres,
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
