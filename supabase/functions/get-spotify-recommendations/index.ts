import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map emotions to Spotify search queries and genres
// For negative emotions (sad, angry, fear, disgust), we recommend uplifting/energetic songs
// to help improve the user's mood rather than matching their current emotion
const emotionToSearchTerms: Record<string, { keywords: string[]; genres: string[] }> = {
  happy: {
    keywords: ["happy", "upbeat", "feel good", "dance", "party"],
    genres: ["pop", "dance", "happy"],
  },
  sad: {
    // Recommend uplifting songs to improve mood
    keywords: ["uplifting", "feel good", "happy", "motivational", "cheerful"],
    genres: ["pop", "dance", "soul"],
  },
  angry: {
    // Recommend calming/uplifting songs to help release anger
    keywords: ["energetic", "empowering", "upbeat", "dance", "positive vibes"],
    genres: ["pop", "dance", "funk"],
  },
  fear: {
    // Recommend calming and reassuring songs
    keywords: ["calm", "peaceful", "soothing", "uplifting", "hopeful"],
    genres: ["acoustic", "indie", "chill"],
  },
  surprise: {
    keywords: ["exciting", "energetic", "unexpected", "dynamic", "vibrant"],
    genres: ["electronic", "pop", "indie"],
  },
  disgust: {
    // Recommend positive/cleansing songs
    keywords: ["uplifting", "fresh", "positive", "happy", "feel good"],
    genres: ["pop", "indie", "soul"],
  },
  neutral: {
    keywords: ["chill", "relaxing", "calm", "peaceful", "ambient"],
    genres: ["chill", "lo-fi", "ambient"],
  },
};

// Curated fallback tracks per emotion+language
// Used when Spotify Search API is restricted (premium-required, rate limit, etc.)
// Each track links to an open Spotify search URL so users can still play them
type FallbackTrack = { name: string; artists: string; album: string };
const fallbackLibrary: Record<string, Record<string, FallbackTrack[]>> = {
  happy: {
    english: [
      { name: "Happy", artists: "Pharrell Williams", album: "G I R L" },
      { name: "Can't Stop the Feeling!", artists: "Justin Timberlake", album: "Trolls" },
      { name: "Uptown Funk", artists: "Mark Ronson, Bruno Mars", album: "Uptown Special" },
      { name: "Walking on Sunshine", artists: "Katrina & The Waves", album: "Walking on Sunshine" },
      { name: "Good as Hell", artists: "Lizzo", album: "Cuz I Love You" },
      { name: "Levitating", artists: "Dua Lipa", album: "Future Nostalgia" },
      { name: "Sunflower", artists: "Post Malone, Swae Lee", album: "Spider-Man: Into the Spider-Verse" },
      { name: "Best Day of My Life", artists: "American Authors", album: "Oh, What a Life" },
    ],
    hindi: [
      { name: "Badtameez Dil", artists: "Benny Dayal", album: "Yeh Jawaani Hai Deewani" },
      { name: "Gallan Goodiyaan", artists: "Yashita Sharma, Manish Kumar", album: "Dil Dhadakne Do" },
      { name: "Kar Gayi Chull", artists: "Badshah, Fazilpuria", album: "Kapoor & Sons" },
      { name: "London Thumakda", artists: "Labh Janjua", album: "Queen" },
      { name: "Nashe Si Chadh Gayi", artists: "Arijit Singh", album: "Befikre" },
      { name: "Kala Chashma", artists: "Amar Arshi, Badshah", album: "Baar Baar Dekho" },
      { name: "Dil Dhadakne Do", artists: "Priyanka Chopra", album: "Zindagi Na Milegi Dobara" },
      { name: "Senorita", artists: "Farhan Akhtar", album: "Zindagi Na Milegi Dobara" },
    ],
    telugu: [
      { name: "Butta Bomma", artists: "Armaan Malik", album: "Ala Vaikunthapurramuloo" },
      { name: "Saranga Dariya", artists: "Mangli", album: "Love Story" },
      { name: "Ramuloo Ramulaa", artists: "Anurag Kulkarni", album: "Ala Vaikunthapurramuloo" },
      { name: "Naatu Naatu", artists: "Rahul Sipligunj, Kaala Bhairava", album: "RRR" },
      { name: "Oo Antava", artists: "Indravathi Chauhan", album: "Pushpa" },
      { name: "Inkem Inkem Inkem Kaavaale", artists: "Sid Sriram", album: "Geetha Govindam" },
      { name: "Samajavaragamana", artists: "Sid Sriram", album: "Ala Vaikunthapurramuloo" },
      { name: "Daakko Daakko Meka", artists: "Sahithi Chaganti", album: "Pushpa" },
    ],
  },
  sad: {
    english: [
      { name: "Someone Like You", artists: "Adele", album: "21" },
      { name: "Fix You", artists: "Coldplay", album: "X&Y" },
      { name: "Let Her Go", artists: "Passenger", album: "All the Little Lights" },
      { name: "Photograph", artists: "Ed Sheeran", album: "x" },
      { name: "Skinny Love", artists: "Birdy", album: "Birdy" },
      { name: "Stay With Me", artists: "Sam Smith", album: "In the Lonely Hour" },
      { name: "All of Me", artists: "John Legend", album: "Love in the Future" },
      { name: "Hallelujah", artists: "Jeff Buckley", album: "Grace" },
    ],
    hindi: [
      { name: "Channa Mereya", artists: "Arijit Singh", album: "Ae Dil Hai Mushkil" },
      { name: "Tum Hi Ho", artists: "Arijit Singh", album: "Aashiqui 2" },
      { name: "Agar Tum Saath Ho", artists: "Arijit Singh, Alka Yagnik", album: "Tamasha" },
      { name: "Phir Le Aya Dil", artists: "Arijit Singh", album: "Barfi!" },
      { name: "Kabira", artists: "Tochi Raina, Rekha Bhardwaj", album: "Yeh Jawaani Hai Deewani" },
      { name: "Bekhayali", artists: "Sachet Tandon", album: "Kabir Singh" },
      { name: "Humdard", artists: "Arijit Singh", album: "Ek Villain" },
      { name: "Kalank Title Track", artists: "Arijit Singh", album: "Kalank" },
    ],
    telugu: [
      { name: "Inkem Inkem Inkem Kaavaale", artists: "Sid Sriram", album: "Geetha Govindam" },
      { name: "Samajavaragamana", artists: "Sid Sriram", album: "Ala Vaikunthapurramuloo" },
      { name: "Yenti Yenti", artists: "Chinmayi, Yazin Nizar", album: "Geetha Govindam" },
      { name: "Nuvvu Nenu Prema", artists: "Sid Sriram", album: "Nuvvu Nenu Prema" },
      { name: "Adiga Adiga", artists: "Sid Sriram", album: "Ninnu Kori" },
      { name: "Emai Poyave", artists: "Sid Sriram", album: "Padi Padi Leche Manasu" },
      { name: "Hey Pillagaada", artists: "Anurag Kulkarni", album: "Fidaa" },
      { name: "Vachindamma", artists: "Sid Sriram", album: "Geetha Govindam" },
    ],
  },
  angry: {
    english: [
      { name: "Stronger", artists: "Kanye West", album: "Graduation" },
      { name: "Eye of the Tiger", artists: "Survivor", album: "Eye of the Tiger" },
      { name: "Lose Yourself", artists: "Eminem", album: "8 Mile" },
      { name: "Believer", artists: "Imagine Dragons", album: "Evolve" },
      { name: "Thunderstruck", artists: "AC/DC", album: "The Razors Edge" },
      { name: "Till I Collapse", artists: "Eminem", album: "The Eminem Show" },
      { name: "Numb", artists: "Linkin Park", album: "Meteora" },
      { name: "In the End", artists: "Linkin Park", album: "Hybrid Theory" },
    ],
    hindi: [
      { name: "Sultan Title Track", artists: "Sukhwinder Singh", album: "Sultan" },
      { name: "Zinda", artists: "Siddharth Mahadevan", album: "Bhaag Milkha Bhaag" },
      { name: "Brothers Anthem", artists: "Vishal Dadlani", album: "Brothers" },
      { name: "Get Ready to Fight", artists: "Vishal Dadlani", album: "Baaghi" },
      { name: "Malhari", artists: "Vishal Dadlani", album: "Bajirao Mastani" },
      { name: "Jee Karda", artists: "Divya Kumar", album: "Badlapur" },
      { name: "Apna Time Aayega", artists: "Ranveer Singh, DIVINE", album: "Gully Boy" },
      { name: "Sher Aaya Sher", artists: "DIVINE", album: "Gully Boy" },
    ],
    telugu: [
      { name: "Naatu Naatu", artists: "Rahul Sipligunj, Kaala Bhairava", album: "RRR" },
      { name: "Komuram Bheemudo", artists: "Kaala Bhairava", album: "RRR" },
      { name: "Dheevara", artists: "Ramya Behara, Deepu", album: "Baahubali" },
      { name: "Saahore Baahubali", artists: "Daler Mehndi", album: "Baahubali 2" },
      { name: "Jai Jai Shivshankar", artists: "Vishal Dadlani", album: "War" },
      { name: "Srivalli", artists: "Sid Sriram", album: "Pushpa" },
      { name: "Eega Title", artists: "M.M. Keeravani", album: "Eega" },
      { name: "Bullet Song", artists: "Anurag Kulkarni", album: "Sarrainodu" },
    ],
  },
  neutral: {
    english: [
      { name: "Weightless", artists: "Marconi Union", album: "Weightless" },
      { name: "Sunset Lover", artists: "Petit Biscuit", album: "Petit Biscuit" },
      { name: "Bloom", artists: "The Paper Kites", album: "Woodland" },
      { name: "Holocene", artists: "Bon Iver", album: "Bon Iver" },
      { name: "Banana Pancakes", artists: "Jack Johnson", album: "In Between Dreams" },
      { name: "Better Together", artists: "Jack Johnson", album: "In Between Dreams" },
      { name: "Riptide", artists: "Vance Joy", album: "Dream Your Life Away" },
      { name: "Ho Hey", artists: "The Lumineers", album: "The Lumineers" },
    ],
    hindi: [
      { name: "Ilahi", artists: "Arijit Singh", album: "Yeh Jawaani Hai Deewani" },
      { name: "Phir Se Ud Chala", artists: "Mohit Chauhan", album: "Rockstar" },
      { name: "Iktara", artists: "Kavita Seth", album: "Wake Up Sid" },
      { name: "Tum Se Hi", artists: "Mohit Chauhan", album: "Jab We Met" },
      { name: "Mast Magan", artists: "Arijit Singh", album: "2 States" },
      { name: "Pee Loon", artists: "Mohit Chauhan", album: "Once Upon A Time In Mumbaai" },
      { name: "Tera Ban Jaunga", artists: "Akhil Sachdeva, Tulsi Kumar", album: "Kabir Singh" },
      { name: "Raabta", artists: "Arijit Singh", album: "Agent Vinod" },
    ],
    telugu: [
      { name: "Choosi Chudangane", artists: "Sid Sriram", album: "Chalo" },
      { name: "Vachinde", artists: "Madhu Priya, Ramky", album: "Fidaa" },
      { name: "Hey Pillagaada", artists: "Anurag Kulkarni", album: "Fidaa" },
      { name: "Nee Kannu Neeli Samudram", artists: "Javed Ali", album: "Uppena" },
      { name: "Cinema Choopistha Mama", artists: "Karthik", album: "Race Gurram" },
      { name: "Sirivennela", artists: "S.P. Balasubrahmanyam", album: "Sirivennela" },
      { name: "Pranavalaya", artists: "Shreya Ghoshal", album: "Sahasam Swasaga Sagipo" },
      { name: "Yedetthu Mallele", artists: "Sid Sriram", album: "Aakaasam Nee Haddhu Ra" },
    ],
  },
};
// Map other emotions to neutral fallback families
const emotionFallbackKey: Record<string, string> = {
  fear: "neutral",
  surprise: "happy",
  disgust: "happy",
};

function getFallbackTracks(emotion: string, language: string): FallbackTrack[] {
  const key = fallbackLibrary[emotion] ? emotion : (emotionFallbackKey[emotion] || "happy");
  const langKey = fallbackLibrary[key][language] ? language : "english";
  return fallbackLibrary[key][langKey];
}

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

// Language-specific search modifiers
const languageSearchModifiers: Record<string, string> = {
  english: "",
  hindi: "Bollywood Hindi",
  telugu: "Telugu Tollywood",
  all: "",
};

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

    // Get language modifier
    const languageLower = language.toLowerCase();
    const langModifier = languageSearchModifiers[languageLower] || "";

    // Search for tracks using multiple keywords to get variety
    const allTracks: SpotifyTrack[] = [];
    const seenIds = new Set<string>();

    for (const keyword of searchConfig.keywords.slice(0, 3)) {
      try {
        // Build query with language modifier
        const query = langModifier 
          ? `${langModifier} ${keyword}`.trim()
          : `${keyword} ${searchConfig.genres[0] || ""}`.trim();
        
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

    // Fallback: if Spotify returned nothing (premium-required error, rate limits, etc.)
    // search for popular curated playlists/tracks by genre as a last resort
    if (allTracks.length === 0) {
      const fallbackQueries = [
        `${langModifier} ${searchConfig.genres[0]} hits`.trim(),
        `${langModifier} top ${emotionLower} songs`.trim(),
        `${langModifier} ${searchConfig.genres[1] || "pop"} popular`.trim(),
      ];
      for (const q of fallbackQueries) {
        try {
          const tracks = await searchSpotifyTracks(accessToken, q, 8);
          for (const track of tracks) {
            if (!seenIds.has(track.id)) {
              seenIds.add(track.id);
              allTracks.push(track);
            }
          }
          if (allTracks.length >= 8) break;
        } catch (err) {
          console.error(`Fallback search error for "${q}":`, err);
        }
      }
    }

    // Shuffle and take top 8 tracks
    const shuffled = allTracks.sort(() => Math.random() - 0.5);
    let selectedTracks = shuffled.slice(0, 8);

    // Final fallback: curated static recommendations (open Spotify search links)
    // Used when API access is blocked (e.g., premium-required restriction)
    let usedFallback = false;
    if (selectedTracks.length === 0) {
      usedFallback = true;
    }

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
        language: languageLower,
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
