const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json() as { messages: Message[] };
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
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

    const systemPrompt = `You are an empathetic and friendly mood companion AI for a music recommendation app called "Feel the Beat". Your role is to:

1. Have natural, warm conversations with users about how they're feeling
2. Pick up on emotional cues in their messages
3. Analyze their emotional state based on the conversation
4. Respond with understanding and suggest that music might help

When responding:
- Be conversational and supportive, not clinical
- Use emojis naturally but not excessively
- If they share something sad/difficult, acknowledge it with empathy
- If they're happy/excited, share in their enthusiasm
- Keep responses concise (2-3 sentences max)
- After understanding their mood, mention you'll find perfect music for them

You MUST call the analyze_emotion function with your assessment after each user message.

Focus on these core emotions: happy, sad, angry, surprised, fearful, neutral, anxious, excited, loving, calm

Example responses:
- "That sounds like a really tough day 😔 Let me find some soothing music to help you unwind."
- "That's amazing news! 🎉 I can feel your excitement! Let's celebrate with some upbeat tunes!"
- "I hear you - that frustration is totally valid. Some energizing music might help channel that energy."`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_emotion',
              description: 'Analyze and return the detected emotion from the conversation',
              parameters: {
                type: 'object',
                additionalProperties: false,
                required: ['emotions', 'dominantEmotion', 'confidence', 'responseMessage'],
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
                  responseMessage: { 
                    type: 'string',
                    description: 'The conversational response to show the user'
                  },
                },
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_emotion' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Service temporarily unavailable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to analyze mood' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const args = result?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;

    if (!args) {
      return new Response(
        JSON.stringify({ error: 'Failed to analyze mood' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = JSON.parse(args);
    
    return new Response(
      JSON.stringify({
        message: parsed.responseMessage,
        emotion: {
          dominantEmotion: parsed.dominantEmotion,
          confidence: parsed.confidence,
          emotions: parsed.emotions,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
