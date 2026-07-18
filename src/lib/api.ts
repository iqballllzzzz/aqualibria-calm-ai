// API Configuration - All AI calls go through edge functions
// System prompts are NEVER sent from client — only a promptType key is sent
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const GEMINI_CHAT_URL = `${SUPABASE_URL}/functions/v1/gemini-chat`;
const TTS_URL = `${SUPABASE_URL}/functions/v1/tts-google`;
const DUAL_AGENT_URL = `${SUPABASE_URL}/functions/v1/dual-agent`;
const ANALYZE_YT_URL = `${SUPABASE_URL}/functions/v1/analyze-youtube`;
const FELO_SEARCH_URL = `${SUPABASE_URL}/functions/v1/felo-search`;

export interface FeloSearchResult {
  ok: boolean;
  text?: string;
  sources?: Array<{ index: number; title?: string; url?: string; snippet?: string }>;
  error?: string;
}
export const feloSearch = async (query: string): Promise<FeloSearchResult> => {
  try {
    const res = await fetch(FELO_SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ query }),
    });
    return await res.json();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "felo_failed" };
  }
};

// Voice Options
export const VOICE_OPTIONS_LIST = ["eva"] as const;
export type VoiceOption = typeof VOICE_OPTIONS_LIST[number];

export const VOICE_OPTIONS_MAP: Record<VoiceOption, { displayName: string; gender: "male" | "female"; description: string }> = {
  eva: { displayName: "Eva", gender: "female", description: "Warm & natural" },
};

export const VOICE_OPTIONS = Object.keys(VOICE_OPTIONS_MAP) as VoiceOption[];
export const getVoiceDisplayName = (voice: VoiceOption): string => VOICE_OPTIONS_MAP[voice]?.displayName || voice;
export const getVoiceInfo = (voice: VoiceOption) => VOICE_OPTIONS_MAP[voice];

// Subscription Plans
export type PlanType = "junior" | "senior" | "superior" | "nigown";

export interface SubscriptionPlan {
  id: PlanType;
  name: string;
  price: number;
  priceDisplay: string;
  originalPrice?: number;
  originalPriceDisplay?: string;
  discountPercent?: number;
  promoLabel?: string;
  dailyLimit: number | "unlimited";
  model: string;
  modelDisplay: string;
  features: string[];
  color: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "junior",
    name: "Junior",
    price: 0,
    priceDisplay: "Free",
    dailyLimit: 200,
    model: "aqualibriav1",
    modelDisplay: "AqualibriaV1",
    features: ["Chat unlimited", "Fullstack 5x/hari", "AI Slides 8x/hari", "AI Designer 20x/hari", "LatentLeaf (15x/hari)", "Image upload & analysis", "File & PDF analysis", "YouTube analysis"],
    color: "from-muted to-muted",
  },
  {
    id: "senior",
    name: "Senior",
    price: 19000,
    priceDisplay: "Rp 19.000",
    originalPrice: 89000,
    originalPriceDisplay: "Rp 89.000",
    discountPercent: 78,
    promoLabel: "PROMO LAUNCH 78% OFF",
    dailyLimit: 1000,
    model: "aqualibriav2",
    modelDisplay: "AqualibriaV2 Pro",
    features: ["V2 Pro (reasoning lebih dalam)", "Fullstack 20x/hari + 200 kredit/bulan", "AI Slides 30x/hari + 300 kredit gambar/bulan", "AI Designer 50x/hari", "LatentLeaf Unlimited", "Priority queue", "Extended memory 30 sesi"],
    color: "from-foreground/10 to-foreground/20",
  },
  {
    id: "superior",
    name: "Superior",
    price: 49000,
    priceDisplay: "Rp 49.000",
    originalPrice: 249000,
    originalPriceDisplay: "Rp 249.000",
    discountPercent: 80,
    promoLabel: "PROMO LAUNCH 80% OFF",
    dailyLimit: "unlimited",
    model: "aqualibriav3",
    modelDisplay: "AqualibriaV3 Ultra",
    features: ["V3 Ultra (top-tier reasoning)", "Fullstack 50x/hari + 1000 kredit/bulan", "AI Slides 60x/hari + 1500 kredit gambar/bulan", "AI Designer 100x/hari", "Memory penuh lintas sesi", "Konteks maksimum", "Priority support 24/7"],
    color: "from-foreground/10 to-foreground/20",
  },
  {
    id: "nigown",
    name: "Nigown",
    price: 99000,
    priceDisplay: "Rp 99.000",
    originalPrice: 499000,
    originalPriceDisplay: "Rp 499.000",
    discountPercent: 80,
    promoLabel: "PROMO LAUNCH 80% OFF",
    dailyLimit: "unlimited",
    model: "aqualibriav3",
    modelDisplay: "AqualibriaV3 MAX",
    features: ["Unlimited everything", "All models unlocked", "All agents unlimited", "Maximum context & memory", "Priority processing", "No restrictions"],
    color: "from-primary to-primary/80",
  },
];

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageUrl?: string;
  imageUrls?: string[];
  id?: string;
  isVoiceChat?: boolean;
  fileData?: string;
  fileName?: string;
  fileType?: string;
  fileUrl?: string;
  fileMimeType?: string;
  videoUrl?: string;
  isDualAgent?: boolean;
  perspectiveA?: string;
  perspectiveB?: string;
  agentAName?: string;
  agentBName?: string;
  selectedPerspective?: "A" | "B";
  reasoning?: string;
  isStreaming?: boolean;
}

export interface APIStatus {
  chat: boolean;
  imageAnalysis: boolean;
  research: boolean;
  spotify: boolean;
  imageGeneration: boolean;
}

export const generateMessageId = (): string => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to call Gemini edge function (non-streaming)
const callGemini = async (body: any): Promise<any> => {
  const response = await fetch(GEMINI_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(errData.error || `API error: ${response.status}`);
  }

  return response.json();
};

// Streaming chat — returns token-by-token via callback
export const streamChatMessage = async (
  options: {
    messages: any[];
    promptType: string;
    model: string;
    memoryContext?: string;
    youtubeUrl?: string;
    onDelta: (text: string) => void;
    onReasoning?: (text: string) => void;
    onDone: () => void;
    onError: (error: string) => void;
  }
): Promise<void> => {
  const { messages, promptType, model, memoryContext, youtubeUrl, onDelta, onReasoning, onDone, onError } = options;

  try {
    const resp = await fetch(GEMINI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ action: "chat", messages, promptType, model, memoryContext, youtubeUrl, stream: true }),
      signal: AbortSignal.timeout(120000),
    });

    if (!resp.ok || !resp.body) {
      const errData = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
      onError(errData.error || `API error: ${resp.status}`);
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          const reasoning = parsed.choices?.[0]?.delta?.reasoning_content as string | undefined;
          if (reasoning && onReasoning) onReasoning(reasoning);
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (error: any) {
    onError(error.message || "Stream failed");
  }
};

// Convert file to base64 data URL
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Extract text from DOCX files
export const extractTextFromDocx = async (file: File): Promise<string> => {
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim().slice(0, 15000) || "Could not extract text from this document.";
  } catch (e) {
    console.error("DOCX extraction error:", e);
    return "Failed to extract document content.";
  }
};

export const extractTextFromFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).slice(0, 15000));
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export const isVisionSupportedFile = (mimeType: string): boolean => {
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
};

// Non-streaming chat (legacy support)
export const sendChatMessage = async (
  message: string,
  sessionId: string,
  options: {
    imageData?: string;
    imageDataList?: string[];
    fileData?: string;
    fileTextContent?: string;
    fileUrl?: string;
    fileMimeType?: string;
    videoUrl?: string;
    isCodingMode?: boolean;
    isResearchMode?: boolean;
    model?: string;
    memoryContext?: string;
    youtubeUrl?: string;
    conversationHistory?: {
      role: string;
      content: string;
      imageData?: string;
      fileData?: string;
    }[];
  } = {}
): Promise<{ success: boolean; response?: string; reasoning?: string; error?: string }> => {
  try {
    const {
      imageData, imageDataList, fileData, fileTextContent,
      isCodingMode = false, isResearchMode = false,
      model = "aqualibriav1", memoryContext = "", youtubeUrl,
      conversationHistory = [],
    } = options;

    if (!message || message.trim().length === 0) return { success: false, error: "Message cannot be empty" };
    if (message.length > 50000) return { success: false, error: "Message too long (max 50000 characters)" };

    let textToSend = message.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
    if (isResearchMode) textToSend = `Please research thoroughly and provide detailed findings about: ${textToSend}`;
    if (fileTextContent) textToSend = `${textToSend}\n\n[Document Content]:\n${fileTextContent}`;

    // Determine prompt type — server selects the actual prompt
    let promptType = isCodingMode ? "coding" : model === "aqualibriav2" ? "v2" : model === "aqualibriav3" ? "v3" : "default";

    const messages: any[] = [];
    for (const msg of conversationHistory) {
      const msgObj: any = { role: msg.role, content: msg.content };
      if (msg.imageData) msgObj.imageData = msg.imageData;
      if (msg.fileData) msgObj.fileData = msg.fileData;
      messages.push(msgObj);
    }

    const allImages = imageDataList && imageDataList.length > 0 ? imageDataList : imageData ? [imageData] : [];
    const currentMsg: any = { role: "user", content: textToSend };
    if (allImages.length > 0) currentMsg.imageDataList = allImages;
    if (fileData) currentMsg.fileData = fileData;
    messages.push(currentMsg);

    const data = await callGemini({
      action: "chat",
      messages,
      promptType,
      model,
      youtubeUrl,
      memoryContext,
      sessionId,
    });

    if (data.success && data.response) {
      return { success: true, response: data.response, reasoning: data.reasoning };
    }
    return { success: false, error: data.error || "No response from AI" };
  } catch (error: any) {
    console.error("API Error:", error);
    return { success: false, error: error.message || "Failed to get response" };
  }
};

// YouTube Analysis via dedicated edge function
export const analyzeYouTube = async (url: string, question: string, _sessionId: string): Promise<{ success: boolean; response?: string; error?: string }> => {
  try {
    const response = await fetch(ANALYZE_YT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ videoUrl: url, prompt: question }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      return { success: false, error: errData.error || `API error: ${response.status}` };
    }

    const data = await response.json();
    if (data.success && data.analysis) {
      return { success: true, response: data.analysis };
    }
    return { success: false, error: data.error || "No analysis generated" };
  } catch (error: any) {
    return { success: false, error: error.message || "YouTube analysis failed" };
  }
};

// Dual Agent
export const getDualAgentPerspectives = async (
  message: string,
  conversationHistory: { role: string; content: string }[] = [],
  memoryContext: string = ""
): Promise<{ needsDual: boolean; perspectiveA?: string; perspectiveB?: string; agentAName?: string; agentBName?: string; error?: string }> => {
  try {
    const response = await fetch(DUAL_AGENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ message, conversationHistory, memoryContext }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) return { needsDual: false };
    return await response.json();
  } catch { return { needsDual: false }; }
};

export const sendResearchQuery = async (query: string, sessionId: string) => sendChatMessage(query, sessionId, { isResearchMode: true });
export const analyzeImage = async (imageData: string, question: string, sessionId: string) => sendChatMessage(question, sessionId, { imageData });
export const sendCodingMessage = async (message: string, sessionId: string, imageData?: string) => sendChatMessage(message, sessionId, { isCodingMode: true, imageData });
export const analyzeFile = async (fileData: string, question: string, sessionId: string, fileTextContent?: string) => sendChatMessage(question, sessionId, { fileData, fileTextContent });

// Image Generation
export const generateImage = async (prompt: string): Promise<{ success: boolean; imageUrl?: string; response?: string; error?: string }> => {
  try {
    const data = await callGemini({ action: "generate-image", prompt });
    if (data.success && data.imageUrl) return { success: true, imageUrl: data.imageUrl };
    if (data.success && data.response) return { success: true, response: data.response };
    return { success: false, error: data.error || "Failed to generate image" };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate image" };
  }
};

// Slide Image Generation (AI Slides agent)
export const generateSlideImage = async (prompt: string): Promise<{ success: boolean; imageUrl?: string; response?: string; error?: string }> => {
  try {
    const data = await callGemini({ action: "generate-slide", prompt });
    if (data.success && data.imageUrl) return { success: true, imageUrl: data.imageUrl, response: data.response };
    if (data.success && data.response) return { success: true, response: data.response };
    return { success: false, error: data.error || "Failed to generate slide" };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate slide" };
  }
};

// Slide Deck (2-4 connected image slides, image-only output)
export interface SlideDeckResult {
  success: boolean;
  slides?: { index: number; role: string; imageUrl: string | null }[];
  error?: string;
}

export const generateSlideDeck = async (
  prompt: string,
  slideCount: 2 | 3 | 4 = 4
): Promise<SlideDeckResult> => {
  try {
    const data = await callGemini({ action: "generate-slide-deck", prompt, slideCount });
    if (data.success && Array.isArray(data.slides)) {
      return { success: true, slides: data.slides };
    }
    return { success: false, error: data.error || "Failed to generate slide deck" };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate slide deck" };
  }
};

// Hybrid Credit System
export interface CreditsRow {
  plan: string;
  image_credits: number;
  fullstack_credits: number;
  period_start: string;
  daily_fullstack?: number;
  daily_slides?: number;
  daily_designer?: number;
  daily_reset_at?: string;
}

export interface CreditUsageLog {
  id: string;
  kind: "image" | "slides" | "designer" | "fullstack";
  amount: number;
  source: "daily" | "monthly";
  plan: string;
  created_at: string;
}

const CREDIT_URL = `${SUPABASE_URL}/functions/v1/consume-credit`;
const LLAMACODER_URL = `${SUPABASE_URL}/functions/v1/llamacoder`;

export const fetchCreditStatus = async (
  plan: string,
  accessToken: string
): Promise<{ ok: boolean; credits?: CreditsRow; error?: string }> => {
  try {
    const r = await fetch(CREDIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ action: "status", plan }),
    });
    const data = await r.json();
    if (!r.ok) return { ok: false, error: data.error || `Status ${r.status}` };
    return { ok: true, credits: data.credits };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
};

export const consumeCredit = async (
  kind: "image" | "fullstack" | "slides" | "designer",
  amount: number,
  plan: string,
  accessToken: string
): Promise<{ ok: boolean; credits?: CreditsRow; reason?: string; error?: string }> => {
  try {
    const r = await fetch(CREDIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ action: "consume", kind, amount, plan }),
    });
    const data = await r.json();
    if (!r.ok) return { ok: false, credits: data.credits, reason: data.reason, error: data.error || (r.status === 402 ? undefined : `Status ${r.status}`) };
    return { ok: !!data.ok, credits: data.credits, reason: data.reason };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
};

export const fetchCreditUsageLogs = async (): Promise<{ ok: boolean; logs: CreditUsageLog[]; error?: string }> => {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await (supabase as any)
      .from("credit_usage_logs")
      .select("id, kind, amount, source, plan, created_at")
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) return { ok: false, logs: [], error: error.message };
    return { ok: true, logs: (data || []) as CreditUsageLog[] };
  } catch (e: any) {
    return { ok: false, logs: [], error: e.message };
  }
};

// Design Image Generation (AI Design agent)
export const generateDesignImage = async (prompt: string): Promise<{ success: boolean; imageUrl?: string; response?: string; error?: string }> => {
  try {
    const data = await callGemini({ action: "generate-design", prompt });
    if (data.success && data.imageUrl) return { success: true, imageUrl: data.imageUrl, response: data.response };
    if (data.success && data.response) return { success: true, response: data.response };
    return { success: false, error: data.error || "Failed to generate design" };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate design" };
  }
};

export const editImageLatentLeaf = async (prompt: string, imageBase64: string) => {
  try {
    const data = await callGemini({ action: "edit-image", prompt, imageBase64 });
    if (data.success && data.imageUrl) return { success: true, editedImageUrl: data.imageUrl };
    return { success: false, error: data.error || "Failed to edit image" };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to edit image" };
  }
};

export const uploadImage = async (file: File) => {
  try {
    const base64 = await fileToBase64(file);
    return { success: true, imageUrl: base64 };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to process image" };
  }
};

export const searchSpotify = async (query: string) => {
  try {
    const response = await fetch(`https://api.ryzumi.vip/api/search/spotify?query=${encodeURIComponent(query)}`, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Spotify API returned ${response.status}`);
    const data = await response.json();
    return { success: true, results: data.results || data.tracks || data };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to search Spotify" };
  }
};

export const checkPaymentStatus = async (orderId: string, amount: number) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/pakasir-payment?action=status&order_id=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(amount)}`,
      { method: "GET", headers: { "apikey": SUPABASE_KEY } }
    );
    return await response.json();
  } catch (error: any) {
    return { success: false, error: error.message || "Payment check failed" };
  }
};

// LlamaCoder Fullstack Generator
export type LlamaCoderModel = "deepseek-v3.1" | "qwen3-coder" | "kimi-k2.1" | "glm-4.6";

export const generateFullstackCode = async (
  prompt: string,
  accessToken: string,
  plan: string,
  model: LlamaCoderModel = "qwen3-coder",
  quality: "low" | "high" = "high",
): Promise<{ success: boolean; code?: string; model?: string; error?: string; status?: number; retryAfterSeconds?: number }> => {
  try {
    const r = await fetch(LLAMACODER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ prompt, model, quality, plan }),
      signal: AbortSignal.timeout(180000),
    });
    const data = await r.json();
    if (!r.ok) return { success: false, error: data.error || `Status ${r.status}`, status: r.status, retryAfterSeconds: data.retry_after_seconds };
    return { success: !!data.success, code: data.code, model: data.model, error: data.error };
  } catch (e: any) {
    return { success: false, error: e.message || "LlamaCoder failed" };
  }
};

// TTS
export const textToSpeech = async (text: string, voice: VoiceOption = "eva") => {
  try {
    const cleanText = text
      .replace(/\*\*/g, "").replace(/\*/g, "")
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/#{1,6}\s*/g, "")
      .replace(/\n{2,}/g, ". ")
      .slice(0, 800);

    const response = await fetch(TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ text: cleanText, voice }),
      signal: AbortSignal.timeout(30000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.audioUrl && !data.fallback) {
        return { success: true, audioUrl: data.audioUrl };
      }
    }

    console.warn("Gemini TTS unavailable, using browser fallback");
    const voiceGender = VOICE_OPTIONS_MAP[voice]?.gender || "female";
    return enhancedBrowserTTS(text, { gender: voiceGender, name: voice });
  } catch (error: any) {
    console.warn("TTS error, using browser fallback:", error.message);
    const voiceGender = VOICE_OPTIONS_MAP[voice]?.gender || "female";
    return enhancedBrowserTTS(text, { gender: voiceGender, name: voice });
  }
};

const enhancedBrowserTTS = async (text: string, options: { gender: string; name: string }): Promise<{ success: boolean; audioUrl?: string; error?: string }> => {
  try {
    if (!('speechSynthesis' in window)) return { success: false, error: "Speech synthesis not supported" };
    const cleanText = text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/`{1,3}[^`]*`{1,3}/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/#{1,6}\s*/g, "").slice(0, 500);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1; utterance.pitch = 1; utterance.volume = 1;
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith("id")) || voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes(options.gender === "female" ? "female" : "male")) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
