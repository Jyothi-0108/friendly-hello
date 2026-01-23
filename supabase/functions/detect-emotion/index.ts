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
            content: `You are an advanced facial emotion detection system similar to DeepFace. Analyze the image and:

1. First, check if a human face is clearly visible in the image
2. If NO face is detected, determine the reason:
   - "no_face" - No human face present in the frame
   - "poor_lighting" - Face may be present but lighting is too dark or too bright
   - "partial_face" - Only partial face visible (cropped or at extreme angle)
   - "blurry" - Image is too blurry to detect facial features
   - "multiple_faces" - Multiple faces detected (analyze the most prominent one)

3. If a face IS detected, analyze the facial expression and classify the emotion using DeepFace emotion categories:
   - happy, sad, angry, fear, surprise, disgust, neutral

Return ONLY via the provided function tool. Be strict about face detection - if you cannot clearly see facial features (eyes, nose, mouth), report as not detected.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image for facial emotion detection. First determine if a clear face is visible, then classify the emotion if detected.",
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
              description: "Return facial emotion detection results including face detection status.",
              parameters: {
                type: "object",
                additionalProperties: false,
                required: ["faceDetected", "detectionStatus"],
                properties: {
                  faceDetected: { 
                    type: "boolean",
                    description: "Whether a clear human face was detected in the image"
                  },
                  detectionStatus: { 
                    type: "string",
                    enum: ["detected", "no_face", "poor_lighting", "partial_face", "blurry", "multiple_faces"],
                    description: "The face detection status"
                  },
                  detectionMessage: {
                    type: "string",
                    description: "Human-readable message explaining the detection result"
                  },
                  dominantEmotion: { 
                    type: "string",
                    description: "The primary emotion detected (only if face detected)"
                  },
                  confidence: { 
                    type: "integer", 
                    minimum: 0, 
                    maximum: 100,
                    description: "Confidence percentage for dominant emotion"
                  },
                  emotions: {
                    type: "array",
                    maxItems: 7,
                    description: "All detected emotions with confidence scores (DeepFace categories)",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["emotion", "confidence"],
                      properties: {
                        emotion: { 
                          type: "string",
                          enum: ["happy", "sad", "angry", "fear", "surprise", "disgust", "neutral"]
                        },
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
      faceDetected: boolean;
      detectionStatus: string;
      detectionMessage?: string;
      dominantEmotion?: string;
      confidence?: number;
      emotions?: Array<{ emotion: string; confidence: number }>;
    };

    // If face not detected, return appropriate error with reason
    if (!parsed.faceDetected) {
      const messages: Record<string, string> = {
        no_face: "No face detected in the frame. Please position your face in front of the camera.",
        poor_lighting: "Face not visible due to poor lighting. Please ensure good lighting on your face.",
        partial_face: "Only partial face visible. Please center your entire face in the frame.",
        blurry: "Image is too blurry. Please hold still and ensure the camera is focused.",
        multiple_faces: "Multiple faces detected. Please ensure only one person is in the frame.",
      };

      return new Response(
        JSON.stringify({
          faceDetected: false,
          detectionStatus: parsed.detectionStatus,
          error: parsed.detectionMessage || messages[parsed.detectionStatus] || "Face not detected",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Face detected - return emotion results
    return new Response(
      JSON.stringify({
        faceDetected: true,
        detectionStatus: "detected",
        emotions: parsed.emotions || [],
        dominantEmotion: parsed.dominantEmotion,
        confidence: parsed.confidence,
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
