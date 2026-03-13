import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, prompt } = await req.json();

    if (!videoUrl) {
      return new Response(JSON.stringify({ error: 'videoUrl is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract video ID from URL
    const videoIdMatch = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    const videoId = videoIdMatch?.[1] || '';

    if (!videoId) {
      return new Response(JSON.stringify({ error: 'Invalid YouTube URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch video metadata from noembed
    let videoTitle = '';
    let channelName = '';
    try {
      const metaRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (metaRes.ok) {
        const meta = await metaRes.json();
        videoTitle = meta.title || '';
        channelName = meta.author_name || '';
      }
    } catch (e) {
      console.warn('Failed to fetch video metadata:', e);
    }

    // Try to get transcript via a public transcript API
    let transcript = '';
    try {
      // Try youtubetranscript.com API
      const transcriptRes = await fetch(`https://yt.lemnoslife.com/noKey/captions?part=snippet&videoId=${videoId}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (transcriptRes.ok) {
        const transcriptData = await transcriptRes.json();
        const items = transcriptData?.items;
        if (items && items.length > 0) {
          // Find auto-generated or manual caption
          const caption = items.find((i: any) => i.snippet?.language === 'id' || i.snippet?.language === 'en') || items[0];
          if (caption?.snippet?.baseUrl || caption?.id) {
            // Try to fetch the actual captions text
            const captionUrl = caption.snippet?.baseUrl;
            if (captionUrl) {
              const captionRes = await fetch(captionUrl, { signal: AbortSignal.timeout(8000) });
              if (captionRes.ok) {
                const captionText = await captionRes.text();
                // Parse XML transcript
                const textMatches = captionText.match(/<text[^>]*>([^<]*)<\/text>/g);
                if (textMatches) {
                  transcript = textMatches
                    .map((t: string) => t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"'))
                    .join(' ')
                    .slice(0, 12000);
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Transcript fetch failed (expected):', e);
    }

    const userPrompt = prompt || 'Apa poin utama dari video ini?';

    let contextInfo = `Video Information:
- URL: ${videoUrl}
- Title: ${videoTitle || 'Unknown'}
- Channel: ${channelName || 'Unknown'}
- Video ID: ${videoId}`;

    if (transcript) {
      contextInfo += `\n\nVideo Transcript:\n${transcript}`;
    }

    const systemPrompt = `You are AquaLibriaAI, a helpful AI assistant created by M Iqbal.S. You are analyzing a YouTube video. Answer in the user's language (Indonesian if the content is Indonesian).

${contextInfo}

${transcript 
  ? 'You have the full transcript of this video. Analyze it thoroughly - extract key points, main topics, important details, and provide a comprehensive summary.'
  : 'You have the video title and channel info but no transcript. Analyze what you can infer from the title, channel name, and topic. Be upfront that your analysis is based on metadata, not the actual video content.'
}`;

    const response = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI Gateway error:', response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || 'No analysis generated';

    return new Response(JSON.stringify({
      success: true,
      analysis,
      videoTitle,
      channelName,
      videoId,
      hasTranscript: !!transcript,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
