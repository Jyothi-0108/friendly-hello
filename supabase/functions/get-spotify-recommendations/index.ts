import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a music recommendation engine. Given an emotion, suggest 8 real songs that match that mood. Return ONLY via the provided function tool. Use real artist names and song titles.",
          },
          {
            role: "user",
            content: `Suggest 8 songs for someone feeling "${emotion}".`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_song_recommendations",
              description: "Return song recommendations for a given emotion.",
              parameters: {
                type: "object",
                additionalProperties: false,
                required: ["tracks", "emotion", "genres"],
                properties: {
                  emotion: { type: "string" },
                  genres: {
                    type: "array",
                    items: { type: "string" },
                    maxItems: 3,
                  },
                  tracks: {
                    type: "array",
                    maxItems: 8,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["id", "name", "artists", "album"],
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        artists: { type: "string" },
                        album: { type: "string" },
                        albumArt: { type: "string", nullable: true },
                        previewUrl: { type: "string", nullable: true },
                        spotifyUrl: { type: "string", nullable: true },
                        duration: { type: "integer", nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_song_recommendations" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits and try again." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to get recommendations" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const args = result?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;

    if (!args) {
      console.error("AI response missing tool_calls:", JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: "Failed to get recommendations" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(args) as {
      emotion: string;
      genres: string[];
      tracks: Array<{
        id: string;
        name: string;
        artists: string;
        album: string;
        albumArt?: string | null;
        previewUrl?: string | null;
        spotifyUrl?: string | null;
        duration?: number | null;
      }>;
    };

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-spotify-recommendations function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
