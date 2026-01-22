const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'Audio file is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!ELEVENLABS_API_KEY || !LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Transcribe audio using ElevenLabs
    const transcribeFormData = new FormData();
    transcribeFormData.append('file', audioFile);
    transcribeFormData.append('model_id', 'scribe_v2');

    const transcribeResponse = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: transcribeFormData,
    });

    if (!transcribeResponse.ok) {
      console.error('Transcription error:', transcribeResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to transcribe audio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transcription = await transcribeResponse.json();
    const transcribedText = transcription.text;

    if (!transcribedText || transcribedText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'No speech detected in audio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Analyze emotion from transcribed text
    const emotionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an emotion detection AI. Analyze the emotional content of spoken text and return emotions with confidence scores.
Focus on these emotions: happy, sad, angry, surprised, fearful, disgusted, neutral, anxious, excited, loving.
Consider both the content and how someone might have said these words.
Return results via the provided function tool.`,
          },
          {
            role: 'user',
            content: `Analyze the emotional content of this spoken text: "${transcribedText}"`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'return_emotion_analysis',
              description: 'Return emotion analysis results',
              parameters: {
                type: 'object',
                additionalProperties: false,
                required: ['emotions', 'dominantEmotion', 'confidence', 'transcribedText'],
                properties: {
                  emotions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['emotion', 'confidence'],
                      properties: {
                        emotion: { type: 'string' },
                        confidence: { type: 'number', minimum: 0, maximum: 100 },
                      },
                    },
                  },
                  dominantEmotion: { type: 'string' },
                  confidence: { type: 'number', minimum: 0, maximum: 100 },
                  transcribedText: { type: 'string' },
                },
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'return_emotion_analysis' } },
      }),
    });

    if (!emotionResponse.ok) {
      console.error('Emotion analysis error:', emotionResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze emotion' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await emotionResponse.json();
    const args = result?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;

    if (!args) {
      return new Response(
        JSON.stringify({ error: 'Failed to analyze emotion' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = JSON.parse(args);
    // Ensure transcribed text is included
    parsed.transcribedText = transcribedText;

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
