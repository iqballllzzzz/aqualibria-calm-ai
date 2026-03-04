import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, messages, systemPrompt, model, imageData, fileData, youtubeUrl } = body;

    // Default model
    const geminiModel = model || "gemini-2.5-flash-preview-05-20";

    if (action === "generate-image") {
      // Use Gemini image generation (gemini-2.0-flash-exp with image output)
      const imageModel = "gemini-2.0-flash-exp";
      const url = `${GEMINI_BASE}/models/${imageModel}:generateContent?key=${GEMINI_API_KEY}`;
      
      const prompt = body.prompt || "Generate an image";
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Gemini image error:", response.status, errText);
        return new Response(JSON.stringify({ error: `Gemini API error: ${response.status}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      let imageBase64 = null;
      let textResponse = "";

      for (const part of parts) {
        if (part.inlineData) {
          imageBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        if (part.text) {
          textResponse += part.text;
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        imageUrl: imageBase64, 
        text: textResponse 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "edit-image") {
      // LatentLeaf: edit image using Gemini vision + image output
      const imageModel = "gemini-2.0-flash-exp";
      const url = `${GEMINI_BASE}/models/${imageModel}:generateContent?key=${GEMINI_API_KEY}`;
      
      const prompt = body.prompt || "Edit this image";
      const imgData = body.imageBase64; // base64 image data
      
      const parts: any[] = [{ text: prompt }];
      if (imgData) {
        // Extract mime type and data from data URL
        const match = imgData.match(/^data:(.*?);base64,(.*)$/);
        if (match) {
          parts.unshift({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          });
        }
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Gemini edit error:", response.status, errText);
        return new Response(JSON.stringify({ error: `Gemini API error: ${response.status}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const resParts = data.candidates?.[0]?.content?.parts || [];
      let resultImage = null;
      let resultText = "";

      for (const part of resParts) {
        if (part.inlineData) {
          resultImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        if (part.text) {
          resultText += part.text;
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        imageUrl: resultImage, 
        text: resultText 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Chat / Vision / File Analysis / YouTube Analysis
    const url = `${GEMINI_BASE}/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`;

    // Build contents array
    const contents: any[] = [];

    // Add system instruction
    const systemInstruction = systemPrompt || "You are AquaLibriaAI, a calm, intelligent AI assistant created by M Iqbal.S. You help with thinking, coding, learning, and creating. Always respond in the user's language.";

    // Build message history
    if (messages && messages.length > 0) {
      for (const msg of messages) {
        const parts: any[] = [];
        
        if (msg.content) {
          parts.push({ text: msg.content });
        }
        
        // Add image data if present
        if (msg.imageData) {
          const match = msg.imageData.match(/^data:(.*?);base64,(.*)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2],
              },
            });
          }
        }

        // Add file data if present
        if (msg.fileData) {
          const match = msg.fileData.match(/^data:(.*?);base64,(.*)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2],
              },
            });
          }
        }

        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts,
        });
      }
    }

    // Add YouTube URL analysis
    if (youtubeUrl) {
      // Use Gemini's ability to analyze YouTube URLs
      const lastContent = contents[contents.length - 1];
      if (lastContent && lastContent.role === "user") {
        lastContent.parts.push({ text: `\n\nPlease analyze this YouTube video: ${youtubeUrl}` });
      }
    }

    const requestBody: any = {
      contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        topP: 0.95,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini chat error:", response.status, errText);
      return new Response(JSON.stringify({ error: `Gemini API error: ${response.status}`, details: errText }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts
      ?.map((p: any) => p.text)
      .filter(Boolean)
      .join("") || "No response generated.";

    return new Response(JSON.stringify({ 
      success: true, 
      response: responseText 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("gemini-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
