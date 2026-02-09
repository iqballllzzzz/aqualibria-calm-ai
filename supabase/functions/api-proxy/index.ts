// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://id-preview--e62bce47-cea9-435b-af2a-e3a7bda27e91.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Credentials": "true",
  };
}

// All API endpoints are stored server-side only
const ENDPOINTS: Record<string, string> = {
  chat: "https://api.ryzumi.vip/api/ai/gemini",
  spotify: "https://api.ryzumi.vip/api/search/spotify",
  image_gen: "https://api.nexray.web.id/ai/v1/text2image",
  image_upload: "https://api.ryzumi.vip/api/uploader/ryzumicdn",
  image_edit: "https://api.nexray.web.id/ai/gptimage",
  tts: "https://rynekoo-api.hf.space/tools/tts/qwen",
};

// Input validation
const MAX_TEXT_LENGTH = 10000;
const MAX_PROMPT_LENGTH = 5000;
const VALID_ACTIONS = new Set(Object.keys(ENDPOINTS));

function validateAction(action: string | null): action is string {
  return !!action && VALID_ACTIONS.has(action);
}

function sanitizeText(text: string, maxLength: number): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").slice(0, maxLength);
}

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (!validateAction(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Valid: " + Object.keys(ENDPOINTS).join(", ") }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetBase = ENDPOINTS[action];

    // Validate specific parameters based on action
    if (action === "chat") {
      const text = url.searchParams.get("text");
      if (!text || text.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: "Text parameter is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (text.length > MAX_TEXT_LENGTH) {
        return new Response(
          JSON.stringify({ error: `Text too long (max ${MAX_TEXT_LENGTH} chars)` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const imageUrl = url.searchParams.get("imageUrl");
      if (imageUrl && !validateUrl(imageUrl)) {
        return new Response(
          JSON.stringify({ error: "Invalid imageUrl" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (action === "spotify") {
      const query = url.searchParams.get("query");
      if (!query || query.trim().length === 0 || query.length > 200) {
        return new Response(
          JSON.stringify({ error: "Invalid query parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (action === "image_gen") {
      const prompt = url.searchParams.get("prompt");
      if (!prompt || prompt.trim().length === 0 || prompt.length > MAX_PROMPT_LENGTH) {
        return new Response(
          JSON.stringify({ error: "Invalid prompt parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Handle GET-based APIs (chat, spotify, image_gen, tts)
    if (req.method === "GET" || (req.method === "POST" && action === "chat_get")) {
      const forwardParams = new URLSearchParams();
      url.searchParams.forEach((value, key) => {
        if (key !== "action") {
          forwardParams.append(key, sanitizeText(value, MAX_TEXT_LENGTH));
        }
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
        const formData = await req.formData();
        
        // Validate file size (max 10MB)
        for (const [, value] of formData.entries()) {
          if (value instanceof File && value.size > 10 * 1024 * 1024) {
            return new Response(
              JSON.stringify({ error: "File too large (max 10MB)" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        fetchOptions = {
          method: "POST",
          body: formData,
          signal: AbortSignal.timeout(120000),
        };
      } else {
        const body = await req.text();
        if (body.length > 100000) {
          return new Response(
            JSON.stringify({ error: "Request body too large" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
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
    const corsHeaders = getCorsHeaders(req);
    console.error("API proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
