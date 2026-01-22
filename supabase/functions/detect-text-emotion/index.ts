

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are an emotion detection AI. Analyze the emotional content of text and return emotions with confidence scores. 
Focus on these emotions: happy, sad, angry, surprised, fearful, disgusted, neutral, anxious, excited, loving.
Return results via the provided function tool.`,
          },
          {
            role: 'user',
            content: `Analyze the emotional content of this text: "${text}"`,
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
                required: ['emotions', 'dominantEmotion', 'confidence'],
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
                },
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'return_emotion_analysis' } },
      }),
    });

    if (!response.ok) {
      console.error('AI gateway error:', response.status, await response.text());
      return new Response(
        JSON.stringify({ error: 'Failed to analyze emotion' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const args = result?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;

    if (!args) {
      return new Response(
        JSON.stringify({ error: 'Failed to analyze emotion' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = JSON.parse(args);
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
