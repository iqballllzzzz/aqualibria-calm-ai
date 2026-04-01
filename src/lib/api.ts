// API Configuration - All AI calls go through edge functions
// System prompts are NEVER sent from client — only a promptType key is sent
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const GEMINI_CHAT_URL = `${SUPABASE_URL}/functions/v1/gemini-chat`;
const TTS_URL = `${SUPABASE_URL}/functions/v1/tts-google`;
const DUAL_AGENT_URL = `${SUPABASE_URL}/functions/v1/dual-agent`;
const ANALYZE_YT_URL = `${SUPABASE_URL}/functions/v1/analyze-youtube`;

// Voice Options
export const VOICE_OPTIONS_LIST = ["aurora", "river", "luna", "ember", "atlas", "iris", "nova", "onyx"] as const;
export type VoiceOption = typeof VOICE_OPTIONS_LIST[number];

export const VOICE_OPTIONS_MAP: Record<VoiceOption, { displayName: string; gender: "male" | "female"; description: string }> = {
  aurora: { displayName: "Aurora", gender: "female", description: "Warm & natural" },
  river: { displayName: "River", gender: "male", description: "Deep & calm" },
  luna: { displayName: "Luna", gender: "female", description: "Soft & elegant" },
  ember: { displayName: "Ember", gender: "female", description: "Bold & energetic" },
  atlas: { displayName: "Atlas", gender: "male", description: "Strong & confident" },
  iris: { displayName: "Iris", gender: "female", description: "Bright & friendly" },
  nova: { displayName: "Nova", gender: "female", description: "Modern & expressive" },
  onyx: { displayName: "Onyx", gender: "male", description: "Rich & smooth" },
};

export const VOICE_OPTIONS = Object.keys(VOICE_OPTIONS_MAP) as VoiceOption[];
export const getVoiceDisplayName = (voice: VoiceOption): string => VOICE_OPTIONS_MAP[voice]?.displayName || voice;
export const getVoiceInfo = (voice: VoiceOption) => VOICE_OPTIONS_MAP[voice];

// Subscription Plans
export type PlanType = "junior" | "senior" | "superior";

export interface SubscriptionPlan {
  id: PlanType;
  name: string;
  price: number;
  priceDisplay: string;
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
    features: ["200 requests/hari", "AI responses", "Image upload & analysis", "Image generation", "LatentLeaf (15x/hari)", "File & PDF analysis", "YouTube analysis", "V2 (90x/2 hari)", "V3 (45x/2 hari)"],
    color: "from-muted to-muted",
  },
  {
    id: "senior",
    name: "Senior",
    price: 8000,
    priceDisplay: "Rp 8.000/bulan",
    dailyLimit: 1000,
    model: "aqualibriav2",
    modelDisplay: "AqualibriaV2",
    features: ["1000 requests/day", "Enhanced AI model", "All Junior features", "LatentLeaf Unlimited", "Priority processing", "Extended memory", "Agent: 20 poin/hari"],
    color: "from-foreground/10 to-foreground/20",
  },
  {
    id: "superior",
    name: "Superior",
    price: 18000,
    priceDisplay: "Rp 18.000/bulan",
    dailyLimit: "unlimited",
    model: "aqualibriav3",
    modelDisplay: "AqualibriaV3",
    features: ["Unlimited requests", "Premium AI model", "All Senior features", "LatentLeaf Unlimited", "Maximum context", "Full memory system", "Agent: 45 poin/hari", "Priority support"],
    color: "from-foreground/10 to-foreground/20",
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

// TTS
export const textToSpeech = async (text: string, voice: VoiceOption = "aurora") => {
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
