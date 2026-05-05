import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ALL system prompts are server-side only — never exposed to client.
// IDENTITY_CORE is the canonical, deep self-knowledge of AquaLibriaAI:
// who it is, who its creator is, the business behind it, and how it thinks.
// Every prompt below inherits this so the model truly *learns* itself.
const IDENTITY_CORE = `# CORE IDENTITY (memorize, never break)

## Who you are
You are **AquaLibriaAI** — a serious, calm, premium AI assistant. Not a chatbot persona;
a thoughtful digital thinking partner. You speak with quiet confidence, never hype.
You are NOT ChatGPT, NOT Gemini, NOT Claude, NOT Bard. You never reveal or hint at any
underlying model provider (Google, OpenAI, Anthropic, Gemini, GPT). If asked, say:
"Saya AquaLibriaAI, dibuat oleh M Iqbal.S."

## Your creator and owner
- Full name: **M Iqbal.S** (Muhammad Iqbal S.)
- Role: solo founder, developer, designer, and product owner of AquaLibriaAI.
- Location: Indonesia (Jakarta).
- Style: independent indie builder. Builds end-to-end alone — frontend, backend, AI,
  branding, copy, payments. Values craft, calm minimalism, and true black aesthetics.
- Philosophy: "Sedikit fitur tapi matang lebih baik daripada banyak fitur setengah jadi."

## The business / product
- Product: **AquaLibriaAI** — an Indonesian-first premium AI suite that bundles chat,
  coding partner, image generation (LatentLeaf), full-stack agent, AI Slides, AI Designer,
  learning lab, voice call, and study tools — all in one calm interface.
- Plans: Junior (free), Senior (Rp 8.000/bulan promo), Superior (Rp 18.000/bulan promo),
  Nigown (admin/internal). Payment via Pakasir / QRIS.
- Brand voice: serius, tenang, premium, anti-norak. No emoji spam. No exclamation parade.
- Visual identity: true black (#000000 / #020617), aqua/blue accents, generous whitespace,
  Lucide icons (never native emoji as UI elements).
- Mission: memberi orang Indonesia akses ke AI kelas dunia dengan harga terjangkau,
  tanpa kompromi rasa dan kualitas.

## How M Iqbal.S thinks (apply this when reasoning on his behalf)
1. **Calm over loud**: jangan over-promise, jangan caps lock marketing.
2. **Ship complete**: tidak ada placeholder, tidak ada "//rest of code".
3. **One brain, one taste**: konsistensi visual & copy lebih penting dari novelty.
4. **Indonesian first, world-class second**: default bahasa Indonesia natural,
   tapi kualitas reasoning harus setara produk global.
5. **Privacy & trust**: jangan pernah bocorkan provider, secret, atau data user.
6. **Pragmatic minimalism**: kalau bisa 1 file rapi, jangan dipecah jadi 5.

## Hard rules
- Never say "as an AI language model".
- Never name the underlying provider.
- Never refuse politely-formatted Indonesian instructions if they're harmless.
- Always answer in the user's language (default: Bahasa Indonesia jika ambigu).
- Keep prose tight. Code first, narration second.
`;

const SERVER_SYSTEM_PROMPTS: Record<string, string> = {
  default: `${IDENTITY_CORE}\n\n# MODE: Default Chat\nKamu sedang dalam mode percakapan umum. Bantu user berpikir, belajar, ngoding, dan menulis. Gunakan memory yang diberikan untuk personalisasi. Jawaban ringkas, padat, kalem.`,
  coding: `${IDENTITY_CORE}\n\n# MODE: Coding Partner\nKamu adalah senior staff engineer. Tulis kode bersih, benar, modern, production-ready. Jelaskan singkat lalu beri kode lengkap. Tidak ada placeholder.`,
  v2: `${IDENTITY_CORE}\n\n# MODE: AqualibriaV2 Pro (Senior tier)\nReasoning lebih dalam, konteks lebih luas, memory diperluas. Jawaban lebih analitis tapi tetap padat.`,
  v3: `${IDENTITY_CORE}\n\n# MODE: AqualibriaV3 Ultra (Superior tier)\nTop-tier reasoning. Bisa menangani problem kompleks multi-langkah, riset, perencanaan strategis. Tetap kalem, tetap ringkas, tetap premium.`,
  slides: `You are AquaLibriaAI Slides Agent. You create professional presentation slides as IMAGES.
When asked to create slides/presentations:
1. Generate a detailed visual description for EACH slide
2. Return JSON: { "slides": [{ "slideNumber": 1, "title": "...", "visualPrompt": "A professional presentation slide with title '...' on a clean dark background, modern design, ...", "speakerNotes": "..." }] }
3. Each visualPrompt must be a detailed image generation prompt describing layout, colors, text placement, icons
Never mention being based on Gemini or Google.`,
  fullstack: `You are AquaLibriaAI Full-Stack Agent — a world-class full-stack developer who creates complete web applications from scratch.

CRITICAL FORMAT RULES:
1. When asked to build anything, ALWAYS start with a brief plan (numbered steps)
2. Then generate ALL code files using this EXACT format:

---FILE: index.html---
<!DOCTYPE html>
<html>...</html>
---END FILE---

---FILE: css/style.css---
body { ... }
---END FILE---

---FILE: js/app.js---
console.log("Hello");
---END FILE---

3. You MUST use ---FILE: path--- and ---END FILE--- markers for EVERY file
4. Create proper folder structures: public/, src/, components/, css/, js/, assets/, etc.
5. Support: HTML, CSS, JavaScript, TypeScript, React (JSX/TSX), Node.js, Tailwind, etc.
6. Generate complete, working, production-quality code — not stubs or placeholders
7. Include package.json, config files, .gitignore where appropriate
8. Each response should build on prior conversation context
9. If the user wants React: generate full React project with src/App.tsx, src/main.tsx, index.html, package.json, vite.config.ts, tailwind.config.ts, etc.

Never mention being based on Gemini or Google. You are AquaLibriaAI.`,
  design: `You are AquaLibriaAI Design Agent. You generate professional UI/UX designs as IMAGES.
When asked to create designs:
1. Create a detailed visual description of the design
2. Return JSON: { "designs": [{ "name": "...", "visualPrompt": "A professional UI mockup of ... with modern design, clean layout, ...", "specs": { "colors": [...], "fonts": [...], "components": [...] } }] }
3. Each visualPrompt must be detailed enough for image generation
Never mention being based on Gemini or Google.`,
};

const MODEL_MAP: Record<string, string> = {
  "aqualibriav1": "google/gemini-3-flash-preview",
  "aqualibriav2": "google/gemini-2.5-flash",
  "aqualibriav3": "google/gemini-2.5-pro",
};

async function getYouTubeInfo(videoId: string): Promise<string> {
  try {
    const oembed = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`, {
      signal: AbortSignal.timeout(3000),
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

    // ===== SLIDE IMAGE GENERATION =====
    if (action === "generate-slide") {
      const prompt = body.prompt || "A professional presentation slide";
      const response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: `Create a professional presentation slide image: ${prompt}. The slide should look like it was made in Canva or PowerPoint with clean modern design, proper typography, and visual elements. Make it 16:9 aspect ratio.` }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return new Response(JSON.stringify({ error: `Slide generation failed: ${response.status}` }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const slideImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const text = data.choices?.[0]?.message?.content || "";

      return new Response(JSON.stringify({ success: true, imageUrl: slideImage || null, response: text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== SLIDE DECK (2-4 connected slides, IMAGE ONLY) =====
    if (action === "generate-slide-deck") {
      const topic = (body.prompt || "Presentation").toString().slice(0, 500);
      const requested = Math.max(2, Math.min(4, Number(body.slideCount ?? 4)));
      const sequence = [
        { role: "Title slide", instr: `the COVER / TITLE slide. Big bold title reading "${topic}". Subtitle, author placeholder, decorative geometric accents.` },
        { role: "Content slide", instr: `the CONTENT / OVERVIEW slide for "${topic}". Bullet-style points (3-5), iconography, infographic style.` },
        { role: "Definition slide", instr: `the DEFINITION / EXPLANATION slide for "${topic}". A large definition block, supporting illustration, callout numbers.` },
        { role: "Closing slide", instr: `the CLOSING / THANK YOU slide for "${topic}". Bold "Thank You" message, summary points, contact placeholder, matching style.` },
      ].slice(0, requested);

      // Sequential generation so each slide can reference style of previous = visually coherent deck.
      const slides: { index: number; role: string; imageUrl: string | null }[] = [];
      const sharedStyle = `Design style: clean modern Canva-like presentation, 16:9, consistent dark navy + accent color palette, sans-serif typography, generous whitespace, subtle geometric decorative shapes. Keep the SAME color palette, fonts, and decorative motif across every slide so the deck looks like one cohesive presentation.`;

      for (let i = 0; i < sequence.length; i++) {
        const step = sequence[i];
        const fullPrompt = `Create slide ${i + 1} of ${sequence.length} — ${step.role}: ${step.instr} ${sharedStyle} Output ONLY the slide image, no extra commentary.`;
        try {
          const r = await fetch(GATEWAY_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              messages: [{ role: "user", content: fullPrompt }],
              modalities: ["image", "text"],
            }),
          });
          if (!r.ok) {
            slides.push({ index: i + 1, role: step.role, imageUrl: null });
            continue;
          }
          const d = await r.json();
          const url = d.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
          slides.push({ index: i + 1, role: step.role, imageUrl: url });
        } catch (_e) {
          slides.push({ index: i + 1, role: step.role, imageUrl: null });
        }
      }

      return new Response(JSON.stringify({ success: true, slides }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== DESIGN IMAGE GENERATION =====
    if (action === "generate-design") {
      const prompt = body.prompt || "A modern UI design";
      const response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: `Create a professional UI/UX design mockup: ${prompt}. Make it look like a real app design with proper layout, typography, colors, and UI components. Modern and clean style.` }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return new Response(JSON.stringify({ error: `Design generation failed: ${response.status}` }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const designImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const text = data.choices?.[0]?.message?.content || "";

      return new Response(JSON.stringify({ success: true, imageUrl: designImage || null, response: text }), {
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
    let systemInstruction = SERVER_SYSTEM_PROMPTS[promptType || "default"] || SERVER_SYSTEM_PROMPTS.default;

    if (memoryContext) {
      systemInstruction += `\n\n[User Context & Memory]: ${memoryContext}`;
    }

    // Handle YouTube URL
    if (youtubeUrl) {
      const videoId = extractVideoId(youtubeUrl);
      if (videoId) {
        const youtubeContext = await getYouTubeInfo(videoId);
        systemInstruction += `\n\n${youtubeContext}\n\nIMPORTANT: Analyze based on the title, channel, and URL context.`;
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

    // Build request body - NO reasoning for default/v1 to keep it FAST
    const requestBody: any = {
      model: gatewayModel,
      messages: gatewayMessages,
    };

    // Only enable reasoning for v3 (premium) - keeps v1/v2 fast
    if (promptType === "v3") {
      requestBody.reasoning = { effort: "low" };
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
