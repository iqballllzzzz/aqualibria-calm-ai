import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, messages, systemPrompt, model } = body;

    // Model mapping
    const modelMap: Record<string, string> = {
      "gemini-2.5-flash-preview-05-20": "google/gemini-2.5-flash",
      "gemini-2.5-pro-preview-05-06": "google/gemini-2.5-pro",
    };
    const gatewayModel = modelMap[model] || "google/gemini-3-flash-preview";

    // ===== IMAGE GENERATION =====
    if (action === "generate-image") {
      const prompt = body.prompt || "Generate an image";
      const response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Image generation error:", response.status, errText);
        return new Response(JSON.stringify({ error: `API error: ${response.status}` }), {
          status: response.status === 429 ? 429 : response.status === 402 ? 402 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      // Extract image from response
      const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const textResponse = data.choices?.[0]?.message?.content || "";

      if (imageData) {
        return new Response(JSON.stringify({ success: true, imageUrl: imageData, response: textResponse }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, response: textResponse || "Image generation completed but no image was returned." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== IMAGE EDITING =====
    if (action === "edit-image") {
      const prompt = body.prompt || "Edit this image";
      const imgData = body.imageBase64;

      const contentParts: any[] = [];
      if (imgData) {
        contentParts.push({ type: "image_url", image_url: { url: imgData } });
      }
      contentParts.push({ type: "text", text: prompt });

      const response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: contentParts }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Edit image error:", response.status, errText);
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

    // ===== CHAT / VISION / FILE ANALYSIS =====
    const systemInstruction = systemPrompt || "You are AquaLibriaAI, a calm, intelligent AI assistant created by M Iqbal.S. You help with thinking, coding, learning, and creating. Always respond in the user's language.";

    const gatewayMessages: any[] = [
      { role: "system", content: systemInstruction },
    ];

    if (messages && messages.length > 0) {
      for (const msg of messages) {
        const contentParts: any[] = [];

        // Image data (base64 data URL for images)
        if (msg.imageData) {
          contentParts.push({ type: "image_url", image_url: { url: msg.imageData } });
        }

        // File data - only support images and PDFs as image_url
        // For other file types, the text content should be sent in msg.content
        if (msg.fileData) {
          const isImage = msg.fileData.startsWith("data:image/");
          const isPdf = msg.fileData.startsWith("data:application/pdf");
          if (isImage || isPdf) {
            contentParts.push({ type: "image_url", image_url: { url: msg.fileData } });
          }
          // For other types (DOCX etc.), fileTextContent should be appended to content by client
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

    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: gatewayModel,
        messages: gatewayMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Chat error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `API error: ${response.status}`, details: errText }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "No response generated.";

    return new Response(JSON.stringify({ success: true, response: responseText }), {
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
