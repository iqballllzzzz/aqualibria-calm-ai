// API Configuration - Gemini via Edge Function
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const GEMINI_CHAT_URL = `${SUPABASE_URL}/functions/v1/gemini-chat`;
const TTS_URL = `${SUPABASE_URL}/functions/v1/tts-google`;
const DUAL_AGENT_URL = `${SUPABASE_URL}/functions/v1/dual-agent`;

// Voice Options - 8 AI voices
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
  imageUrls?: string[];
  id?: string;
  isVoiceChat?: boolean;
  fileData?: string;
  fileName?: string;
  fileType?: string;
  isDualAgent?: boolean;
  perspectiveA?: string;
  perspectiveB?: string;
  agentAName?: string;
  agentBName?: string;
  selectedPerspective?: "A" | "B";
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
    price: 3000,
    priceDisplay: "Rp 3.000",
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

// Extract text from DOCX files using mammoth
export const extractTextFromDocx = async (file: File): Promise<string> => {
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value.trim().slice(0, 15000);
    return text || "Could not extract text from this document.";
  } catch (e) {
    console.error("DOCX extraction error:", e);
    return "Failed to extract document content.";
  }
};

// Extract text from TXT files
export const extractTextFromFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).slice(0, 15000));
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

// Check if file type is directly supported by the AI vision API
export const isVisionSupportedFile = (mimeType: string): boolean => {
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
};

// Main chat function
export const sendChatMessage = async (
  message: string,
  sessionId: string,
  options: {
    imageData?: string;
    imageDataList?: string[];
    fileData?: string;
    fileTextContent?: string;
    isCodingMode?: boolean;
    isResearchMode?: boolean;
    model?: string;
    memoryContext?: string;
    youtubeUrl?: string;
    conversationHistory?: { role: string; content: string; imageData?: string; fileData?: string }[];
  } = {}
): Promise<{ success: boolean; response?: string; error?: string }> => {
  try {
    const { imageData, imageDataList, fileData, fileTextContent, isCodingMode = false, isResearchMode = false, model = "aqualibriav1", memoryContext = "", youtubeUrl, conversationHistory = [] } = options;

    if (!message || message.trim().length === 0) return { success: false, error: "Message cannot be empty" };
    if (message.length > 50000) return { success: false, error: "Message too long (max 50000 characters)" };

    let textToSend = message.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
    if (isResearchMode) textToSend = `Please research thoroughly and provide detailed findings about: ${textToSend}`;
    
    if (fileTextContent) {
      textToSend = `${textToSend}\n\n[Document Content]:\n${fileTextContent}`;
    }

    let systemPrompt = isCodingMode ? SYSTEM_PROMPTS.coding : 
      model === "aqualibriav2" ? SYSTEM_PROMPTS.v2 : 
      model === "aqualibriav3" ? SYSTEM_PROMPTS.v3 : 
      SYSTEM_PROMPTS.default;
    
    if (memoryContext) {
      systemPrompt += `\n\n[User Context & Memory]: ${memoryContext}`;
    }

    const messages: any[] = [];
    for (const msg of conversationHistory) {
      const msgObj: any = { role: msg.role, content: msg.content };
      if (msg.imageData) msgObj.imageData = msg.imageData;
      if (msg.fileData) msgObj.fileData = msg.fileData;
      messages.push(msgObj);
    }

    // Consolidate all images into imageDataList
    const allImages = imageDataList && imageDataList.length > 0 
      ? imageDataList 
      : (imageData ? [imageData] : []);

    if (allImages.length > 0) {
      const currentMsg: any = { role: "user", content: textToSend, imageDataList: allImages };
      if (fileData) currentMsg.fileData = fileData;
      messages.push(currentMsg);
    } else {
      const currentMsg: any = { role: "user", content: textToSend };
      if (fileData) currentMsg.fileData = fileData;
      messages.push(currentMsg);
    }

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

// Dual Agent - check and get two perspectives
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

    if (!response.ok) {
      return { needsDual: false };
    }

    return await response.json();
  } catch (error: any) {
    console.error("Dual agent error:", error);
    return { needsDual: false };
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
export const analyzeFile = async (fileData: string, question: string, sessionId: string, fileTextContent?: string): Promise<{ success: boolean; response?: string; error?: string }> => {
  return sendChatMessage(question, sessionId, { fileData, fileTextContent });
};

// YouTube Analysis
export const analyzeYouTube = async (url: string, question: string, sessionId: string): Promise<{ success: boolean; response?: string; error?: string }> => {
  return sendChatMessage(question, sessionId, { youtubeUrl: url });
};

// Image Generation
export const generateImage = async (prompt: string): Promise<{ success: boolean; imageUrl?: string; response?: string; error?: string }> => {
  try {
    const data = await callGemini({ action: "generate-image", prompt });
    if (data.success && data.imageUrl) {
      return { success: true, imageUrl: data.imageUrl };
    }
    if (data.success && data.response) {
      return { success: true, response: data.response };
    }
    return { success: false, error: data.error || "Failed to generate image" };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate image" };
  }
};

export const checkPaymentStatus = async (orderId: string, amount: number): Promise<{ success: boolean; paid?: boolean; transaction?: any; error?: string }> => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/pakasir-payment?action=status&order_id=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(amount)}`,
      {
        method: "GET",
        headers: { "apikey": SUPABASE_KEY },
      }
    );
    const data = await response.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message || "Payment check failed" };
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

// Upload image
export const uploadImage = async (file: File): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
  try {
    const base64 = await fileToBase64(file);
    return { success: true, imageUrl: base64 };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to process image" };
  }
};

// Spotify Search
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

// TTS using Gemini native TTS via edge function, with browser fallback
export const textToSpeech = async (text: string, voice: VoiceOption = "aurora"): Promise<{ success: boolean; audioUrl?: string; error?: string }> => {
  try {
    // Clean text for speech - keep short for speed
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
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
      // If we got real audio data back from Gemini TTS
      if (data.success && data.audioUrl && !data.fallback) {
        return { success: true, audioUrl: data.audioUrl };
      }
    }

    // Fallback to browser TTS
    console.warn("Gemini TTS unavailable, using browser fallback");
    const voiceGender = VOICE_OPTIONS_MAP[voice]?.gender || "female";
    return enhancedBrowserTTS(text, { gender: voiceGender, name: voice });
  } catch (error: any) {
    console.warn("TTS error, using browser fallback:", error.message);
    const voiceGender = VOICE_OPTIONS_MAP[voice]?.gender || "female";
    return enhancedBrowserTTS(text, { gender: voiceGender, name: voice });
  }
};

// Enhanced browser TTS with better voice selection
const enhancedBrowserTTS = (text: string, voiceConfig: { gender: string; name: string }): Promise<{ success: boolean; audioUrl?: string; error?: string }> => {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve({ success: false, error: "Speech synthesis not supported" });
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text.slice(0, 2000));
    utterance.rate = 0.95;
    utterance.pitch = voiceConfig.gender === "female" ? 1.1 : 0.9;
    utterance.volume = 1;

    // Find the best matching voice
    const voices = window.speechSynthesis.getVoices();
    let selectedSynthVoice = null;

    // Priority: Google voices > Microsoft voices > Apple voices > default
    const genderFilter = voiceConfig.gender === "male" 
      ? (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes("male") || v.name.includes("David") || v.name.includes("James") || v.name.includes("Guy") || v.name.includes("Mark")
      : (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes("female") || v.name.includes("Samantha") || v.name.includes("Zira") || v.name.includes("Google") || v.name.includes("Sara");

    selectedSynthVoice = voices.find(v => v.lang.startsWith("en") && v.name.includes("Google") && genderFilter(v)) ||
      voices.find(v => v.lang.startsWith("en") && genderFilter(v)) ||
      voices.find(v => v.lang.startsWith("en") && v.name.includes("Google")) ||
      voices.find(v => v.lang.startsWith("en")) ||
      voices.find(v => v.lang.startsWith("id")) ||
      voices[0];

    if (selectedSynthVoice) utterance.voice = selectedSynthVoice;

    utterance.onend = () => resolve({ success: true, audioUrl: "__browser_tts__" });
    utterance.onerror = () => resolve({ success: false, error: "Browser TTS failed" });

    window.speechSynthesis.speak(utterance);
    resolve({ success: true, audioUrl: "__browser_tts__" });
  });
};

export const textToSpeechWithFallback = async (text: string, voice: VoiceOption = "aurora") => textToSpeech(text, voice);

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
    if (!contentType?.includes("application/json")) {
      const text = await response.text();
      console.error("Non-JSON response:", text.slice(0, 200));
      return { success: false, error: "Invalid server response" };
    }
    const data = await response.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message || "Payment creation failed" };
  }
};
