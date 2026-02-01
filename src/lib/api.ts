/* Central API helpers for AquaLibriaAI
   - editImageLatentLeaf => POST multipart to Nexray API (image + param)
   - textToSpeech => call Rynekoo HF Space endpoint; returns audio URL
   - createPakasirCheckout => client helper that calls serverless endpoint /api/pakasir/create-checkout
   - sendChatMessage, generateImage, uploadImage, analyzeImage, sendCodingMessage kept as compatible helpers
*/

export type VoiceOption = "dylan" | "sunny" | "jada" | "cherry" | "ethan" | "serena" | "chelsie";
export const VOICE_OPTIONS: VoiceOption[] = ["dylan","sunny","jada","cherry","ethan","serena","chelsie"];

// Config (can be overridden via env vars)
const API_BASE = (import.meta.env.VITE_API_BASE as string) || "https://api.ryzumi.vip/api/ai/gemini";
const IMAGE_GEN_API = (import.meta.env.VITE_IMAGE_GEN_API as string) || "https://api.nexray.web.id/ai/generate";
const IMAGE_UPLOAD_API = (import.meta.env.VITE_IMAGE_UPLOAD_API as string) || "https://ryzumicdn.example/upload";
const IMAGE_EDIT_API = "https://api.nexray.web.id/ai/gptimage";
const QWEN_TTS_API = "https://rynekoo-api.hf.space/tools/tts/qwen";

// Utilities
export const generateMessageId = (): string => `msg_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;

/* ---------- Chat / AI ---------- */
export const sendChatMessage = async (
  message: string,
  sessionId: string,
  options: {
    imageUrl?: string;
    isCodingMode?: boolean;
    isResearchMode?: boolean;
    model?: string;
    memoryContext?: string;
  } = {}
): Promise<{ success: boolean; response?: string; error?: string }> => {
  try {
    const { imageUrl, isCodingMode = false, isResearchMode = false, model = "aqualibriav1", memoryContext = "" } = options;
    let textToSend = message;
    if (isResearchMode) textToSend = `please research ${message}`;
    if (memoryContext) textToSend = `[Context: ${memoryContext}] ${textToSend}`;
    const systemPrompt = ""; // keep empty or set per-model if you have system prompts
    const params = new URLSearchParams({ text: textToSend, prompt: systemPrompt, session: sessionId });
    if (imageUrl) params.append("imageUrl", imageUrl);
    const url = `${API_BASE}?${params.toString()}`;
    const response = await fetch(url, { method: "GET", headers: { accept: "application/json" }, signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Chat API returned ${response.status}`);
    const data = await response.json();
    // Expect AI text in data.result or data.response
    const aiText = data.result || data.response || data.text || data.output;
    if (!aiText) throw new Error("No AI response");
    return { success: true, response: String(aiText) };
  } catch (err: any) {
    console.error("sendChatMessage error:", err);
    return { success: false, error: err.message || "Failed to send chat message" };
  }
};

/* ---------- Image generation & upload (keep previous behavior) ---------- */
export const generateImage = async (prompt: string): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
  try {
    const formatted = encodeURIComponent(prompt);
    const resp = await fetch(`${IMAGE_GEN_API}?prompt=${formatted}`, { method: "GET", signal: AbortSignal.timeout(120000) });
    if (!resp.ok) throw new Error(`Image generation API returned ${resp.status}`);
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await resp.json();
      const imageUrl = data.url || data.result?.url || data.image || data.data?.url;
      if (imageUrl) return { success: true, imageUrl };
      throw new Error("No image URL in generation response");
    } else {
      const blob = await resp.blob();
      return { success: true, imageUrl: URL.createObjectURL(blob) };
    }
  } catch (err: any) {
    console.error("generateImage error:", err);
    return { success: false, error: err.message || "Failed to generate image" };
  }
};

export const uploadImage = async (file: File): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
  try {
    const formData = new FormData();
    formData.append("file", file, file.name);
    const resp = await fetch(IMAGE_UPLOAD_API, { method: "POST", headers: { accept: "application/json" }, body: formData, signal: AbortSignal.timeout(30000) });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`Upload API returned ${resp.status} - ${txt}`);
    }
    const data = await resp.json();
    const imageUrl = data.url || data.result?.url || data.data?.url || data.link || data.fileUrl || data.file_url;
    if (!imageUrl) throw new Error("No URL returned from upload API");
    return { success: true, imageUrl };
  } catch (err: any) {
    console.error("uploadImage error:", err);
    return { success: false, error: err.message || "Failed to upload image" };
  }
};

export const analyzeImage = async (imageUrl: string, question: string, sessionId: string): Promise<{ success: boolean; response?: string; error?: string }> => {
  // reuse sendChatMessage with imageUrl
  return sendChatMessage(question, sessionId, { imageUrl });
};

export const sendCodingMessage = async (message: string, sessionId: string, imageUrl?: string) => {
  return sendChatMessage(message, sessionId, { isCodingMode: true, imageUrl });
};

/* ---------- LatentLeaf Image Edit (Nexray) ---------- */
export const editImageLatentLeaf = async (
  prompt: string,
  file: File
): Promise<{ success: boolean; editedImageUrl?: string; error?: string }> => {
  try {
    const formData = new FormData();
    formData.append("image", file, file.name);
    formData.append("param", prompt);

    const response = await fetch(IMAGE_EDIT_API, { method: "POST", body: formData, signal: AbortSignal.timeout(120000) });
    if (!response.ok) {
      const txt = await response.text().catch(() => "");
      throw new Error(`Image edit API returned ${response.status} - ${txt}`);
    }

    const ct = response.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await response.json();
      const editedUrl = data.result?.url || data.url || data.image || data.result || data.data?.url;
      if (!editedUrl) throw new Error("No edited image URL returned");
      return { success: true, editedImageUrl: editedUrl };
    } else {
      const blob = await response.blob();
      return { success: true, editedImageUrl: URL.createObjectURL(blob) };
    }
  } catch (err: any) {
    console.error("editImageLatentLeaf error:", err);
    return { success: false, error: err.message || "Failed to edit image" };
  }
};

/* ---------- Text to Speech (Rynekoo HF Space) ---------- */
export const textToSpeech = async (
  text: string,
  voice: VoiceOption = "dylan"
): Promise<{ success: boolean; audioUrl?: string; error?: string }> => {
  try {
    const params = new URLSearchParams({ text, voice });
    const url = `${QWEN_TTS_API}?${params.toString()}`;
    const resp = await fetch(url, { method: "GET", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(120000) });
    if (!resp.ok) throw new Error(`TTS API returned ${resp.status}`);
    const data = await resp.json();
    if (data && (data.success === true || data.result)) {
      const audioUrl = data.result || data.audio || data.url;
      if (!audioUrl) throw new Error("No audio URL returned from TTS API");
      return { success: true, audioUrl };
    }
    throw new Error(data?.error || "No audio URL returned");
  } catch (err: any) {
    console.error("textToSpeech error:", err);
    return { success: false, error: err.message || "Failed to generate speech" };
  }
};

/* ---------- PAKASIR helper (client) ----------
   This helper calls /api/pakasir/create-checkout serverless endpoint.
   Keep PAKASIR_API_KEY in server env (Vercel). */
export const createPakasirCheckout = async (amountRp: number, orderId?: string, redirect?: string): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> => {
  try {
    const resp = await fetch("/api/pakasir/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ amount: amountRp, order_id: orderId, redirect }),
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`Create checkout failed: ${resp.status} ${txt}`);
    }
    const data = await resp.json();
    if (data && data.checkoutUrl) return { success: true, checkoutUrl: data.checkoutUrl };
    throw new Error("No checkoutUrl returned");
  } catch (err: any) {
    console.error("createPakasirCheckout error:", err);
    return { success: false, error: err.message || "Failed to create checkout" };
  }
};
