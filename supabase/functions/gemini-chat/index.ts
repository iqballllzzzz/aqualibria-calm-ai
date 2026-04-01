import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ALL system prompts are server-side only — never exposed to client
const SERVER_SYSTEM_PROMPTS: Record<string, string> = {
  default: "You are AquaLibriaAI, a calm, intelligent, and helpful AI assistant independently created by M Iqbal.S (solo developer, Jakarta, Indonesia). You help users think, code, learn, and create. You have memory of conversations and care about the user. Always respond in the user's language. Never mention being based on Gemini, Google, or any other AI provider - you are AquaLibriaAI.",
  coding: "You are AquaLibriaAI Coding Partner, a world-class software engineer. You write clean, correct, and efficient code. You follow modern best practices and prioritize correctness, clarity, and maintainability. Created by M Iqbal.S. Never mention being based on Gemini or Google.",
  v2: "You are AquaLibriaAI v2 (Senior Model), with enhanced reasoning and context awareness. Created by M Iqbal.S. You have extended memory and better analytical capabilities. Never mention being based on Gemini or Google.",
  v3: "You are AquaLibriaAI v3 (Superior Model), the premium tier with maximum capabilities. Created by M Iqbal.S. You have full memory, maximum context, and all premium features. Never mention being based on Gemini or Google.",
  slides: "You are AquaLibriaAI Slides Agent. You help create professional presentation slides. When asked to create slides, think step by step about the structure, then generate content for each slide with titles, bullet points, and speaker notes. Format your response as JSON with slides array. Never mention being based on Gemini or Google.",
  fullstack: "You are AquaLibriaAI Full-Stack Agent. You are a world-class full-stack developer. You create complete web applications with HTML, CSS, and JavaScript. Plan your work with a todo list first, then implement step by step. Never mention being based on Gemini or Google.",
  design: "You are AquaLibriaAI Design Agent. You create beautiful UI/UX designs described in detail. Provide layouts, color schemes, typography, and component specifications. Never mention being based on Gemini or Google.",
};

const MODEL_MAP: Record<string, string> = {
  "aqualibriav1": "google/gemini-3-flash-preview",
  "aqualibriav2": "google/gemini-2.5-pro",
  "aqualibriav3": "google/gemini-2.5-pro",
  "gemini-2.5-flash-preview-05-20": "google/gemini-2.5-flash",
  "gemini-2.5-pro-preview-05-06": "google/gemini-2.5-pro",
};

async function getYouTubeInfo(videoId: string): Promise<string> {
  try {
    const oembed = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (oembed.ok) {
      const data = await oembed.json();
      return `[YouTube Video Info]\nTitle: ${data.title || "Unknown"}\nChannel: ${data.author_name || "Unknown"}\nVideo ID: ${videoId}\nURL: https://www.youtube.com/watch?v=${videoId}`;
    }
  } catch (e) {
    console.error("YouTube info error:", e);
  }
  return `[YouTube Video]\nVideo ID: ${videoId}\nURL: https://www.youtube.com/watch?v=${videoId}`;
}

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, messages, promptType, model, youtubeUrl, memoryContext, stream } = body;

    const gatewayModel = MODEL_MAP[model] || MODEL_MAP["aqualibriav1"];

    // ===== IMAGE GENERATION =====
    if (action === "generate-image") {
      const prompt = body.prompt || "Generate an image";
      const response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Image gen error:", response.status, errText.slice(0, 300));
        return new Response(JSON.stringify({ error: `Image generation failed: ${response.status}` }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const textResponse = data.choices?.[0]?.message?.content || "";

      if (imageData) {
        return new Response(JSON.stringify({ success: true, imageUrl: imageData, response: textResponse }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, response: textResponse || "Image could not be generated." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== IMAGE EDITING =====
    if (action === "edit-image") {
      const prompt = body.prompt || "Edit this image";
      const imgData = body.imageBase64;
      const contentParts: any[] = [];
      if (imgData) contentParts.push({ type: "image_url", image_url: { url: imgData } });
      contentParts.push({ type: "text", text: prompt });

      const response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: contentParts }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return new Response(JSON.stringify({ error: `API error: ${response.status}` }), {
          status: response.status === 429 ? 429 : response.status === 402 ? 402 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const editedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const text = data.choices?.[0]?.message?.content || "";

      if (editedImage) {
        return new Response(JSON.stringify({ success: true, imageUrl: editedImage, response: text }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, response: text || "Could not generate edited image." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== CHAT (streaming or non-streaming) =====
    // Select system prompt server-side based on promptType key
    let systemInstruction = SERVER_SYSTEM_PROMPTS[promptType || "default"] || SERVER_SYSTEM_PROMPTS.default;

    if (memoryContext) {
      systemInstruction += `\n\n[User Context & Memory]: ${memoryContext}`;
    }

    // Handle YouTube URL
    if (youtubeUrl) {
      const videoId = extractVideoId(youtubeUrl);
      if (videoId) {
        const youtubeContext = await getYouTubeInfo(videoId);
        systemInstruction += `\n\nThe user is asking about a YouTube video. Here is the video information:\n${youtubeContext}\n\nIMPORTANT: Analyze based on the title, channel, and URL context. If the user asks specific questions about video content, explain that you can see the video title and metadata but cannot watch or transcribe the actual video content.`;
      }
    }

    const gatewayMessages: any[] = [{ role: "system", content: systemInstruction }];

    if (messages && messages.length > 0) {
      for (const msg of messages) {
        const contentParts: any[] = [];
        if (msg.imageDataList && Array.isArray(msg.imageDataList)) {
          for (const imgUrl of msg.imageDataList) {
            contentParts.push({ type: "image_url", image_url: { url: imgUrl } });
          }
        } else if (msg.imageData) {
          contentParts.push({ type: "image_url", image_url: { url: msg.imageData } });
        }
        if (msg.fileData) {
          const isImage = msg.fileData.startsWith("data:image/");
          const isPdf = msg.fileData.startsWith("data:application/pdf");
          if (isImage || isPdf) {
            contentParts.push({ type: "image_url", image_url: { url: msg.fileData } });
          }
        }
        if (msg.content) {
          contentParts.push({ type: "text", text: msg.content });
        }
        const useMultipart = contentParts.length > 1 || contentParts.some((p: any) => p.type === "image_url");
        gatewayMessages.push({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: useMultipart ? contentParts : (msg.content || ""),
        });
      }
    }

    // Build request body
    const requestBody: any = {
      model: gatewayModel,
      messages: gatewayMessages,
    };

    // Enable reasoning for complex requests
    if (promptType === "v3" || promptType === "fullstack" || promptType === "slides") {
      requestBody.reasoning = { effort: "medium" };
    }

    if (stream) {
      requestBody.stream = true;
      const response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Stream error:", response.status, errText);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Usage limit reached" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: `API error: ${response.status}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Non-streaming
    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Chat error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `API error: ${response.status}` }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "No response generated.";
    const reasoning = data.choices?.[0]?.message?.reasoning_content || null;

    return new Response(JSON.stringify({ success: true, response: responseText, reasoning }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("gemini-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
