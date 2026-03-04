// API Configuration - Gemini via Edge Function
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const GEMINI_CHAT_URL = `${SUPABASE_URL}/functions/v1/gemini-chat`;

// TTS endpoint (kept from before)
const TTS_ENDPOINT = "https://rynekoo-api.hf.space/tools/tts/qwen";

// Voice Options
export const TTS_VOICE_OPTIONS = ["dylan", "sunny", "jada", "cherry", "ethan", "serena", "chelsie"] as const;
export type TTSVoiceOption = typeof TTS_VOICE_OPTIONS[number];

export const TTS_VOICE_INFO: Record<TTSVoiceOption, { displayName: string; gender: "male" | "female"; description: string }> = {
  dylan: { displayName: "Dylan", gender: "male", description: "Natural & friendly" },
  sunny: { displayName: "Sunny", gender: "female", description: "Bright & cheerful" },
  jada: { displayName: "Jada", gender: "female", description: "Smooth & elegant" },
  cherry: { displayName: "Cherry", gender: "female", description: "Sweet & lively" },
  ethan: { displayName: "Ethan", gender: "male", description: "Deep & confident" },
  serena: { displayName: "Serena", gender: "female", description: "Calm & soothing" },
  chelsie: { displayName: "Chelsie", gender: "female", description: "Warm & expressive" },
};

export const VOICE_OPTIONS_MAP: Record<string, { displayName: string; gender: "male" | "female"; description: string }> = { ...TTS_VOICE_INFO };
export const VOICE_OPTIONS = Object.keys(VOICE_OPTIONS_MAP) as VoiceOption[];
export type VoiceOption = keyof typeof VOICE_OPTIONS_MAP;

export const getVoiceDisplayName = (voice: VoiceOption): string => VOICE_OPTIONS_MAP[voice]?.displayName || voice;
export const getVoiceInfo = (voice: VoiceOption) => VOICE_OPTIONS_MAP[voice];

// System prompts
const SYSTEM_PROMPTS: Record<string, string> = {
  default: "You are AquaLibriaAI, a calm, intelligent, and helpful AI assistant independently created by M Iqbal.S (solo developer, Jakarta, Indonesia). You help users think, code, learn, and create. You have memory of conversations and care about the user. Always respond in the user's language. Never mention being based on Gemini or Google - you are AquaLibriaAI.",
  coding: "You are AquaLibriaAI Coding Partner, a world-class software engineer. You write clean, correct, and efficient code. You follow modern best practices and prioritize correctness, clarity, and maintainability. Created by M Iqbal.S. Never mention being based on Gemini or Google.",
  v2: "You are AquaLibriaAI v2 (Senior Model), with enhanced reasoning and context awareness. Created by M Iqbal.S. You have extended memory and better analytical capabilities. Never mention being based on Gemini or Google.",
  v3: "You are AquaLibriaAI v3 (Superior Model), the premium tier with maximum capabilities. Created by M Iqbal.S. You have full memory, maximum context, and all premium features. Never mention being based on Gemini or Google.",
};

// Gemini model mapping
const MODEL_MAP: Record<string, string> = {
  aqualibriav1: "gemini-2.5-flash-preview-05-20",
  aqualibriav2: "gemini-2.5-pro-preview-05-06",
  aqualibriav3: "gemini-2.5-pro-preview-05-06",
};

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageUrl?: string;
  id?: string;
  isVoiceChat?: boolean;
  fileData?: string;
  fileName?: string;
  fileType?: string;
}

export interface APIStatus {
  chat: boolean;
  imageAnalysis: boolean;
  research: boolean;
  spotify: boolean;
  imageGeneration: boolean;
}

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
    features: ["200 requests/hari", "AI responses", "Image upload & analysis", "Image generation", "LatentLeaf 🍃 (15x/hari)", "File & PDF analysis", "YouTube analysis", "V2 (90x/2 hari)", "V3 (45x/2 hari)"],
    color: "from-gray-500 to-gray-600",
  },
  {
    id: "senior",
    name: "Senior",
    price: 8000,
    priceDisplay: "Rp 8.000",
    dailyLimit: 1000,
    model: "aqualibriav2",
    modelDisplay: "AqualibriaV2",
    features: ["1000 requests/day", "Enhanced AI model", "All Junior features", "LatentLeaf Unlimited", "Priority processing", "Extended memory"],
    color: "from-purple-500 to-purple-700",
  },
  {
    id: "superior",
    name: "Superior",
    price: 16000,
    priceDisplay: "Rp 16.000",
    dailyLimit: "unlimited",
    model: "aqualibriav3",
    modelDisplay: "AqualibriaV3",
    features: ["Unlimited requests", "Premium AI model", "All Senior features", "LatentLeaf Unlimited", "Maximum context", "Full memory system", "Priority support"],
    color: "from-amber-500 to-orange-600",
  },
];

export const generateMessageId = (): string => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to call Gemini edge function
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

// Convert file to base64 data URL
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Main chat function
export const sendChatMessage = async (
  message: string,
  sessionId: string,
  options: {
    imageData?: string;
    fileData?: string;
    isCodingMode?: boolean;
    isResearchMode?: boolean;
    model?: string;
    memoryContext?: string;
    youtubeUrl?: string;
    conversationHistory?: { role: string; content: string; imageData?: string; fileData?: string }[];
  } = {}
): Promise<{ success: boolean; response?: string; error?: string }> => {
  try {
    const { imageData, fileData, isCodingMode = false, isResearchMode = false, model = "aqualibriav1", memoryContext = "", youtubeUrl, conversationHistory = [] } = options;

    if (!message || message.trim().length === 0) return { success: false, error: "Message cannot be empty" };
    if (message.length > 50000) return { success: false, error: "Message too long (max 50000 characters)" };

    let textToSend = message.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
    if (isResearchMode) textToSend = `Please research thoroughly and provide detailed findings about: ${textToSend}`;
    
    let systemPrompt = isCodingMode ? SYSTEM_PROMPTS.coding : 
      model === "aqualibriav2" ? SYSTEM_PROMPTS.v2 : 
      model === "aqualibriav3" ? SYSTEM_PROMPTS.v3 : 
      SYSTEM_PROMPTS.default;
    
    if (memoryContext) {
      systemPrompt += `\n\n[User Context & Memory]: ${memoryContext}`;
    }

    // Build messages array with conversation history
    const messages: any[] = [];
    for (const msg of conversationHistory) {
      const msgObj: any = { role: msg.role, content: msg.content };
      if (msg.imageData) msgObj.imageData = msg.imageData;
      if (msg.fileData) msgObj.fileData = msg.fileData;
      messages.push(msgObj);
    }

    // Add current message
    const currentMsg: any = { role: "user", content: textToSend };
    if (imageData) currentMsg.imageData = imageData;
    if (fileData) currentMsg.fileData = fileData;
    messages.push(currentMsg);

    const geminiModel = MODEL_MAP[model] || MODEL_MAP.aqualibriav1;

    const data = await callGemini({
      action: "chat",
      messages,
      systemPrompt,
      model: geminiModel,
      youtubeUrl,
    });

    if (data.success && data.response) {
      return { success: true, response: data.response };
    }
    return { success: false, error: data.error || "No response from AI" };
  } catch (error: any) {
    console.error("API Error:", error);
    return { success: false, error: error.message || "Failed to get response" };
  }
};

// Research Mode
export const sendResearchQuery = async (query: string, sessionId: string): Promise<{ success: boolean; response?: string; error?: string }> => {
  return sendChatMessage(query, sessionId, { isResearchMode: true });
};

// Image Analysis
export const analyzeImage = async (imageData: string, question: string, sessionId: string): Promise<{ success: boolean; response?: string; error?: string }> => {
  return sendChatMessage(question, sessionId, { imageData });
};

// Coding Partner
export const sendCodingMessage = async (message: string, sessionId: string, imageData?: string): Promise<{ success: boolean; response?: string; error?: string }> => {
  return sendChatMessage(message, sessionId, { isCodingMode: true, imageData });
};

// File Analysis (PDF, DOC, etc.)
export const analyzeFile = async (fileData: string, question: string, sessionId: string): Promise<{ success: boolean; response?: string; error?: string }> => {
  return sendChatMessage(question, sessionId, { fileData });
};

// YouTube Analysis
export const analyzeYouTube = async (url: string, question: string, sessionId: string): Promise<{ success: boolean; response?: string; error?: string }> => {
  return sendChatMessage(question, sessionId, { youtubeUrl: url });
};

// Image Generation
export const generateImage = async (prompt: string): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
  try {
    const data = await callGemini({ action: "generate-image", prompt });
    if (data.success && data.imageUrl) {
      return { success: true, imageUrl: data.imageUrl };
    }
    return { success: false, error: data.error || "Failed to generate image" };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate image" };
  }
};

// LatentLeaf Image Edit
export const editImageLatentLeaf = async (prompt: string, imageBase64: string): Promise<{ success: boolean; editedImageUrl?: string; error?: string }> => {
  try {
    const data = await callGemini({ action: "edit-image", prompt, imageBase64 });
    if (data.success && data.imageUrl) {
      return { success: true, editedImageUrl: data.imageUrl };
    }
    return { success: false, error: data.error || "Failed to edit image" };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to edit image" };
  }
};

// Upload image - now converts to base64 (no external upload needed)
export const uploadImage = async (file: File): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
  try {
    const base64 = await fileToBase64(file);
    return { success: true, imageUrl: base64 };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to process image" };
  }
};

// Spotify Search (kept as direct call)
export const searchSpotify = async (query: string): Promise<{ success: boolean; results?: any[]; error?: string }> => {
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

// TTS
export const textToSpeech = async (text: string, voice: VoiceOption = "dylan"): Promise<{ success: boolean; audioUrl?: string; error?: string }> => {
  try {
    const response = await fetch(`${TTS_ENDPOINT}?text=${encodeURIComponent(text)}&voice=${voice.toLowerCase()}`, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) throw new Error(`TTS API returned ${response.status}`);
    const data = await response.json();
    if (data.success && data.result) return { success: true, audioUrl: data.result };
    throw new Error("No audio URL in response");
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate speech" };
  }
};

export const textToSpeechWithFallback = async (text: string, voice: VoiceOption = "dylan") => textToSpeech(text, voice);

// Payment
const PAKASIR_SLUG = "aqualibria";
export const getPaymentUrl = (amount: number, orderId: string): string => `https://app.pakasir.com/pay/${PAKASIR_SLUG}/${amount}?order_id=${orderId}&qris_only=1`;
export const generateOrderId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AQ${timestamp}${random}`;
};

export const createPaymentTransaction = async (amount: number, orderId: string): Promise<{ success: boolean; payment?: any; error?: string }> => {
  try {
    if (amount === 0) return { success: false, error: "Invalid amount" };
    const response = await fetch(`${SUPABASE_URL}/functions/v1/pakasir-payment?action=create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
      body: JSON.stringify({ order_id: orderId, amount }),
    });
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) throw new Error("Server returned invalid response");
    const data = await response.json();
    if (!data.success || !data.payment) return { success: false, error: data.error || "Gagal membuat pembayaran" };
    return { success: true, payment: data.payment };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create payment" };
  }
};

export const checkPaymentStatus = async (orderId: string, amount?: number): Promise<{ success: boolean; transaction?: any; error?: string }> => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/pakasir-payment?action=status&order_id=${orderId}&amount=${amount || 0}`, {
      headers: { "apikey": SUPABASE_KEY },
    });
    const data = await response.json();
    return { success: true, transaction: { status: data.transaction?.status || "pending" } };
  } catch {
    return { success: true, transaction: { status: "pending" } };
  }
};

export const checkAPIStatus = async (): Promise<APIStatus> => {
  return { chat: true, imageAnalysis: true, research: true, spotify: true, imageGeneration: true };
};
