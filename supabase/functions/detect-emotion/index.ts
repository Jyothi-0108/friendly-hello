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
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const HUGGINGFACE_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY");
    if (!HUGGINGFACE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Hugging Face API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert base64 to binary
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Call Hugging Face emotion detection model (using a well-maintained model)
    const response = await fetch(
      "https://api-inference.huggingface.co/models/dima806/facial_emotions_image_detection",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/octet-stream",
        },
        body: binaryData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hugging Face API error:", response.status, errorText);
      
      // Handle model loading
      if (response.status === 503) {
        return new Response(
          JSON.stringify({ error: "Model is loading, please try again in a few seconds", loading: true }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to detect emotion" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emotions = await response.json();
    console.log("Detected emotions:", emotions);

    // Format the response - the model returns an array of predictions
    const formattedEmotions = emotions.map((e: { label: string; score: number }) => ({
      emotion: e.label,
      confidence: Math.round(e.score * 100),
    }));

    // Get the dominant emotion
    const dominantEmotion = formattedEmotions[0];

    return new Response(
      JSON.stringify({ 
        emotions: formattedEmotions,
        dominantEmotion: dominantEmotion.emotion,
        confidence: dominantEmotion.confidence
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in detect-emotion function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
