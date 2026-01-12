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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dataUrl = imageBase64.startsWith("data:image/")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an emotion detection system. Given ONE face photo, infer the person’s dominant facial emotion and estimate confidence. Return ONLY via the provided function tool.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Analyze the facial expression. Provide the dominantEmotion and top emotions (max 5) with confidence integers 0-100.",
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_emotion_result",
              description: "Return facial emotion classification results.",
              parameters: {
                type: "object",
                additionalProperties: false,
                required: ["dominantEmotion", "confidence", "emotions"],
                properties: {
                  dominantEmotion: { type: "string" },
                  confidence: { type: "integer", minimum: 0, maximum: 100 },
                  emotions: {
                    type: "array",
                    maxItems: 5,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["emotion", "confidence"],
                      properties: {
                        emotion: { type: "string" },
                        confidence: { type: "integer", minimum: 0, maximum: 100 },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_emotion_result" } },
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
        JSON.stringify({ error: "Failed to detect emotion" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const args = result?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;

    if (!args) {
      console.error("AI gateway response missing tool_calls:", JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: "Failed to detect emotion" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(args) as {
      dominantEmotion: string;
      confidence: number;
      emotions: Array<{ emotion: string; confidence: number }>;
    };

    return new Response(
      JSON.stringify({
        emotions: parsed.emotions,
        dominantEmotion: parsed.dominantEmotion,
        confidence: parsed.confidence,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

    // Response is returned earlier in the AI classification block.
  } catch (error) {
    console.error("Error in detect-emotion function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
