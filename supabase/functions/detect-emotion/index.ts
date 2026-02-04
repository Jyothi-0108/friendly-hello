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
            content: `You are an expert facial emotion detection system trained to identify subtle emotional expressions. Your goal is to detect the TRUE emotion, not default to neutral.

CRITICAL DETECTION RULES:
- "neutral" should ONLY be used when the face is completely expressionless (relaxed muscles, no tension, blank stare)
- Look for MICRO-EXPRESSIONS: slight eyebrow raises, lip corners, eye squinting, forehead tension
- Even SLIGHT indicators of emotion should be classified as that emotion, not neutral
- A small smile = happy (not neutral). Slight frown = sad. Tensed jaw = angry. Wide eyes = surprise or fear.

ANALYSIS STEPS:
1. Count visible human faces in the image
2. If NO faces detected, classify reason: "no_face", "poor_lighting", "partial_face", or "blurry"
3. For EACH face, analyze these features carefully:
   - EYES: Are they wide (surprise/fear), squinted (happy/disgust), or drooping (sad)?
   - EYEBROWS: Raised (surprise), furrowed (angry/sad), or relaxed?
   - MOUTH: Smiling (happy), frowning (sad), open (surprise), tight (angry/disgust)?
   - FOREHEAD: Wrinkled (surprise/worry) or smooth?
   - OVERALL MUSCLE TENSION: Tense (anger/fear) or relaxed?

4. Classify using: happy, sad, angry, fear, surprise, disgust, neutral
5. For multiple faces, label positions: "left", "center", "right", "top-left", etc.

IMPORTANT: Be SENSITIVE to emotions. Most people show SOME expression. True neutral (0% expression) is rare. When in doubt between neutral and another emotion, choose the emotion if there's ANY indicator.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image for facial emotion detection. Look carefully for ANY signs of emotion - even subtle ones. Remember: true neutral expressions are RARE. Most people show some emotional indicator. Detect ALL faces and classify each person's ACTUAL emotion, avoiding neutral unless truly expressionless.",
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
              description: "Return multi-face emotion detection results.",
              parameters: {
                type: "object",
                additionalProperties: false,
                required: ["faceCount", "detectionStatus"],
                properties: {
                  faceCount: {
                    type: "integer",
                    minimum: 0,
                    description: "Number of faces detected in the image"
                  },
                  detectionStatus: { 
                    type: "string",
                    enum: ["detected", "no_face", "poor_lighting", "partial_face", "blurry"],
                    description: "The face detection status"
                  },
                  detectionMessage: {
                    type: "string",
                    description: "Human-readable message explaining the detection result"
                  },
                  faces: {
                    type: "array",
                    description: "Array of detected faces with their emotions",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["faceId", "position", "dominantEmotion", "confidence", "emotions"],
                      properties: {
                        faceId: {
                          type: "integer",
                          description: "Unique identifier for this face (1, 2, 3, etc.)"
                        },
                        position: {
                          type: "string",
                          description: "Position of face in image (e.g., 'left', 'center', 'right', 'top-left')"
                        },
                        dominantEmotion: { 
                          type: "string",
                          enum: ["happy", "sad", "angry", "fear", "surprise", "disgust", "neutral"],
                          description: "The primary emotion detected for this face"
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
                          description: "All detected emotions with confidence scores",
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
      faceCount: number;
      detectionStatus: string;
      detectionMessage?: string;
      faces?: Array<{
        faceId: number;
        position: string;
        dominantEmotion: string;
        confidence: number;
        emotions: Array<{ emotion: string; confidence: number }>;
      }>;
    };

    // If no faces detected, return appropriate error with reason
    if (parsed.faceCount === 0 || parsed.detectionStatus !== "detected") {
      const messages: Record<string, string> = {
        no_face: "No face detected in the frame. Please position your face in front of the camera.",
        poor_lighting: "Face not visible due to poor lighting. Please ensure good lighting on your face.",
        partial_face: "Only partial face visible. Please center your entire face in the frame.",
        blurry: "Image is too blurry. Please hold still and ensure the camera is focused.",
      };

      return new Response(
        JSON.stringify({
          faceDetected: false,
          faceCount: 0,
          detectionStatus: parsed.detectionStatus,
          error: parsed.detectionMessage || messages[parsed.detectionStatus] || "Face not detected",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Face(s) detected - return multi-face results
    const faces = parsed.faces || [];
    
    // For backwards compatibility, also include primary face data
    const primaryFace = faces[0];
    
    return new Response(
      JSON.stringify({
        faceDetected: true,
        faceCount: parsed.faceCount,
        detectionStatus: "detected",
        // Primary face (backwards compatibility)
        dominantEmotion: primaryFace?.dominantEmotion,
        confidence: primaryFace?.confidence,
        emotions: primaryFace?.emotions || [],
        // Multi-face data
        faces: faces.map(face => ({
          faceId: face.faceId,
          position: face.position,
          dominantEmotion: face.dominantEmotion,
          confidence: face.confidence,
          emotions: face.emotions,
        })),
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
