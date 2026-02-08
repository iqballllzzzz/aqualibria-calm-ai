const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// All API endpoints are stored server-side only
const ENDPOINTS: Record<string, string> = {
  chat: "https://api.ryzumi.vip/api/ai/gemini",
  spotify: "https://api.ryzumi.vip/api/search/spotify",
  image_gen: "https://api.nexray.web.id/ai/v1/text2image",
  image_upload: "https://api.ryzumi.vip/api/uploader/ryzumicdn",
  image_edit: "https://api.nexray.web.id/ai/gptimage",
  tts: "https://rynekoo-api.hf.space/tools/tts/qwen",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (!action || !ENDPOINTS[action]) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Valid: " + Object.keys(ENDPOINTS).join(", ") }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetBase = ENDPOINTS[action];

    // Handle GET-based APIs (chat, spotify, image_gen, tts)
    if (req.method === "GET" || (req.method === "POST" && action === "chat_get")) {
      // Forward all query params except 'action'
      const forwardParams = new URLSearchParams();
      url.searchParams.forEach((value, key) => {
        if (key !== "action") forwardParams.append(key, value);
      });

      const targetUrl = `${targetBase}?${forwardParams.toString()}`;
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(120000),
      });

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // Binary response (images, audio)
        const blob = await response.arrayBuffer();
        return new Response(blob, {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": contentType || "application/octet-stream",
          },
        });
      }
    }

    // Handle POST-based APIs (image_upload, image_edit)
    if (req.method === "POST") {
      const contentType = req.headers.get("content-type") || "";

      let fetchOptions: RequestInit;

      if (contentType.includes("multipart/form-data")) {
        // Forward FormData as-is
        const formData = await req.formData();
        fetchOptions = {
          method: "POST",
          body: formData,
          signal: AbortSignal.timeout(120000),
        };
      } else {
        // Forward JSON body
        const body = await req.text();
        fetchOptions = {
          method: "POST",
          headers: { "Content-Type": "application/json", accept: "application/json" },
          body,
          signal: AbortSignal.timeout(120000),
        };
      }

      const response = await fetch(targetBase, fetchOptions);
      const respContentType = response.headers.get("content-type") || "";

      if (respContentType.includes("application/json")) {
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const blob = await response.arrayBuffer();
        return new Response(blob, {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": respContentType || "application/octet-stream",
          },
        });
      }
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("API proxy error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
