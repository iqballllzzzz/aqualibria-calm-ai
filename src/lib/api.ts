// API Configuration - Updated to Gemini API
const API_BASE = "https://api.ryzumi.vip/api/ai/gemini";
const SPOTIFY_API = "https://api.ryzumi.vip/api/search/spotify";
const IMAGE_GEN_API = "https://api.nexray.web.id/ai/v1/text2image";
const IMAGE_UPLOAD_API = "https://api.ryzumi.vip/api/uploader/ryzumicdn";
const IMAGE_EDIT_API = "https://api.nexray.web.id/ai/gptimage";
const QWEN_TTS_API = "https://rynekoo-api.hf.space/tools/tts/qwen";

// New TTS Voice Options
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

// Legacy voice mapping (keep for backward compatibility)
export const VOICE_OPTIONS_MAP: Record<string, { displayName: string; gender: "male" | "female"; description: string }> = {
  dylan: { displayName: "Dylan", gender: "male", description: "Natural & friendly" },
  sunny: { displayName: "Sunny", gender: "female", description: "Bright & cheerful" },
  jada: { displayName: "Jada", gender: "female", description: "Smooth & elegant" },
  cherry: { displayName: "Cherry", gender: "female", description: "Sweet & lively" },
  ethan: { displayName: "Ethan", gender: "male", description: "Deep & confident" },
  serena: { displayName: "Serena", gender: "female", description: "Calm & soothing" },
  chelsie: { displayName: "Chelsie", gender: "female", description: "Warm & expressive" },
} as const;

export const VOICE_OPTIONS = Object.keys(VOICE_OPTIONS_MAP) as VoiceOption[];
export type VoiceOption = keyof typeof VOICE_OPTIONS_MAP;

export const getVoiceDisplayName = (voice: VoiceOption): string => {
  return VOICE_OPTIONS_MAP[voice]?.displayName || voice;
};

export const getVoiceInfo = (voice: VoiceOption) => {
  return VOICE_OPTIONS_MAP[voice];
};

// Fixed system prompts - DO NOT MODIFY
const CHAT_SYSTEM_PROMPT = "Contextual identity parameters apply.  Entity designation: AquaLibriaAI   Primary capability: general question answering   Origin: independently created and trained by a M Iqbal.S (solo developer)    Disclosure constraints: - Training source must not reference corporations or external organizations - Developer information, if requested, is limited to:   Location → Indonesia (Jakarta)";

const CODING_PARTNER_SYSTEM_PROMPT = "Contextual identity parameters apply. Entity designation: AquaLibriaAI Coding Partner Primary capability: world-class software engineering, system design, debugging, optimization, and code explanation Expertise level: senior to principal engineer Behavior rules: - Write clean, correct, and efficient code - Follow modern best practices - Avoid unnecessary verbosity - Prioritize correctness, clarity, and maintainability Disclosure constraints: - Training source must not reference corporations or external organizations - Developer information, if requested, is limited to: Location → Indonesia (Jakarta)";

// Model-specific system prompts (same base but "enhanced" for premium)
const AQUALIBRIA_V2_SYSTEM_PROMPT = "Contextual identity parameters apply. Entity designation: AquaLibriaAI v2 (Senior Model) Primary capability: Advanced general question answering with enhanced reasoning and context awareness. Origin: independently created and trained by M Iqbal.S (solo developer). Special features: Enhanced memory, longer context window, better reasoning capabilities. Disclosure constraints: - Training source must not reference corporations - Developer: M Iqbal.S, Indonesia (Jakarta)";

const AQUALIBRIA_V3_SYSTEM_PROMPT = "Contextual identity parameters apply. Entity designation: AquaLibriaAI v3 (Superior Model) Primary capability: Premium AI assistant with maximum capabilities - advanced reasoning, expert knowledge, creative generation, and unlimited potential. Origin: independently created and trained by M Iqbal.S (solo developer). Special features: Full memory system, maximum context, priority processing, all premium features. Disclosure constraints: - Training source must not reference corporations - Developer: M Iqbal.S, Indonesia (Jakarta)";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageUrl?: string;
  id?: string;
  isVoiceChat?: boolean;
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
    dailyLimit: 200, // 200 per day
    model: "aqualibriav1",
    modelDisplay: "AqualibriaV1",
    features: [
      "200 requests / hari",
      "Basic AI responses",
      "Image upload & analysis",
      "Image generation",
      "LatentLeaf (15x / hari)",
      "V2 Model (90x / 2 hari)",
      "V3 Model (45x / 2 hari)",
      "Spotify search",
      "Quote maker",
    ],
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
    features: [
      "1000 requests/day",
      "Enhanced AI model",
      "All Junior features",
      "LatentLeaf Unlimited",
      "Priority processing",
      "Extended memory",
    ],
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
    features: [
      "Unlimited requests",
      "Premium AI model",
      "All Senior features",
      "LatentLeaf Unlimited",
      "Maximum context",
      "Full memory system",
      "Priority support",
    ],
    color: "from-amber-500 to-orange-600",
  },
];

// Generate message ID
export const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get system prompt based on model/plan
const getSystemPromptForModel = (model: string, isCodingMode: boolean = false): string => {
  if (isCodingMode) return CODING_PARTNER_SYSTEM_PROMPT;
  
  switch (model) {
    case "aqualibriav2":
      return AQUALIBRIA_V2_SYSTEM_PROMPT;
    case "aqualibriav3":
      return AQUALIBRIA_V3_SYSTEM_PROMPT;
    default:
      return CHAT_SYSTEM_PROMPT;
  }
};

// Chat API - Main function for all AI interactions using Gemini
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
    
    // Determine the text to send - include memory context for better responses
    let textToSend = message;
    if (isResearchMode) {
      textToSend = `please research ${message}`;
    }
    
    // Add memory context to improve AI awareness
    if (memoryContext) {
      textToSend = `[Context: ${memoryContext}] ${textToSend}`;
    }
    
    // Select system prompt based on mode and model
    const systemPrompt = getSystemPromptForModel(model, isCodingMode);
    
    // Build URL with parameters for Gemini API
    // Format: https://api.ryzumi.vip/api/ai/gemini?text=TEXT&prompt=PROMPT&imageUrl=URL&session=SESSION_ID
    const params = new URLSearchParams({
      text: textToSend,
      prompt: systemPrompt,
      session: sessionId,
    });
    
    // Add imageUrl if provided (for image analysis)
    if (imageUrl) {
      params.append("imageUrl", imageUrl);
    }
    
    const url = `${API_BASE}?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    // Handle various response formats
    const responseText = data.result?.text || data.result || data.response || data.message || data.data?.text || JSON.stringify(data);
    return { 
      success: true, 
      response: responseText 
    };
  } catch (error: any) {
    console.error("API Error:", error);
    return { 
      success: false, 
      error: error.message || "Failed to get response from AI" 
    };
  }
};

// Research Mode - Uses same API with "please research" prefix
export const sendResearchQuery = async (
  query: string,
  sessionId: string
): Promise<{ success: boolean; response?: string; error?: string }> => {
  return sendChatMessage(query, sessionId, { isResearchMode: true });
};

// Image Analysis - Uses same API with imageUrl parameter
export const analyzeImage = async (
  imageUrl: string,
  question: string,
  sessionId: string
): Promise<{ success: boolean; response?: string; error?: string }> => {
  return sendChatMessage(question, sessionId, { imageUrl });
};

// Coding Partner - Uses same API with coding system prompt
export const sendCodingMessage = async (
  message: string,
  sessionId: string,
  imageUrl?: string
): Promise<{ success: boolean; response?: string; error?: string }> => {
  return sendChatMessage(message, sessionId, { isCodingMode: true, imageUrl });
};

// Spotify Search
export const searchSpotify = async (
  query: string
): Promise<{ success: boolean; results?: any[]; error?: string }> => {
  try {
    const response = await fetch(
      `${SPOTIFY_API}?query=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify API returned ${response.status}`);
    }

    const data = await response.json();
    return { success: true, results: data.results || data.tracks || data };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || "Failed to search Spotify" 
    };
  }
};

// Image Generation - Updated to nexray API
export const generateImage = async (
  prompt: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
  try {
    // Format prompt for URL (replace spaces with +)
    const formattedPrompt = prompt.replace(/\s+/g, '+');
    const response = await fetch(
      `${IMAGE_GEN_API}?prompt=${formattedPrompt}`,
      {
        method: "GET",
        signal: AbortSignal.timeout(120000),
      }
    );

    if (!response.ok) {
      throw new Error(`Image generation API returned ${response.status}`);
    }

    // Check if response is JSON with URL or direct image
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      const imageUrl = data.url || data.result?.url || data.image || data.data?.url;
      if (imageUrl) {
        return { success: true, imageUrl };
      }
      throw new Error("No image URL in response");
    } else {
      // Direct image response
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      return { success: true, imageUrl };
    }
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || "Failed to generate image" 
    };
  }
};

// Upload image and get public URL - Using ryzumicdn API
export const uploadImage = async (
  file: File
): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
  try {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch(IMAGE_UPLOAD_API, {
      method: "POST",
      headers: {
        accept: "application/json",
      },
      body: formData,
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Upload failed:", response.status, errorText);
      throw new Error(`Upload API returned ${response.status}`);
    }

    const data = await response.json();
    console.log("Upload response:", data);
    
    // Handle various response formats from ryzumicdn
    const imageUrl = data.url || data.result?.url || data.data?.url || data.link || data.fileUrl || data.file_url;
    
    if (!imageUrl) {
      console.error("No URL in response:", data);
      throw new Error("No URL returned from upload API");
    }

    return { success: true, imageUrl };
  } catch (error: any) {
    console.error("Upload error:", error);
    return { 
      success: false, 
      error: error.message || "Failed to upload image" 
    };
  }
};

// LatentLeaf Image Edit - Using nexray gptimage API (POST with FormData)
export const editImageLatentLeaf = async (
  prompt: string,
  imageFile: File
): Promise<{ success: boolean; editedImageUrl?: string; error?: string }> => {
  try {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("param", prompt);

    const response = await fetch(IMAGE_EDIT_API, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      throw new Error(`Image edit API returned ${response.status}`);
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      const editedUrl = data.result?.url || data.url || data.image || data.result || data.data?.url;
      
      if (!editedUrl) {
        throw new Error("No edited image URL returned");
      }

      return { success: true, editedImageUrl: editedUrl };
    } else {
      // Direct image response
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      return { success: true, editedImageUrl: imageUrl };
    }
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || "Failed to edit image" 
    };
  }
};

// Text to Speech API - Using new Qwen TTS API
export const textToSpeech = async (
  text: string,
  voice: VoiceOption = "dylan"
): Promise<{ success: boolean; audioUrl?: string; error?: string }> => {
  try {
    // Format text for URL (replace spaces with +, encode special chars)
    const formattedText = encodeURIComponent(text);
    const voiceName = voice.toLowerCase();
    
    const response = await fetch(
      `${QWEN_TTS_API}?text=${formattedText}&voice=${voiceName}`,
      {
        method: "GET",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(120000),
      }
    );

    if (!response.ok) {
      throw new Error(`TTS API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Response format: { success: true, result: "http://...wav", timestamp, responseTime }
    if (data.success && data.result) {
      return { success: true, audioUrl: data.result };
    }
    
    throw new Error("No audio URL in response");
  } catch (error: any) {
    console.error("TTS Error:", error);
    return { 
      success: false, 
      error: error.message || "Failed to generate speech" 
    };
  }
};

// TTS with fallback - wrapper for voice chat compatibility
export const textToSpeechWithFallback = async (
  text: string,
  voice: VoiceOption = "dylan"
): Promise<{ success: boolean; audioUrl?: string; error?: string }> => {
  // Use the main TTS function directly (Qwen API is reliable)
  return textToSpeech(text, voice);
};

// Pakasir Payment Integration - Using URL-based approach
const PAKASIR_SLUG = "aqualibria";

export interface PaymentTransaction {
  orderId: string;
  amount: number;
  plan: PlanType;
  status: "pending" | "completed" | "cancelled";
  paymentUrl?: string;
}

// Generate payment URL for Pakasir
export const getPaymentUrl = (amount: number, orderId: string): string => {
  return `https://app.pakasir.com/pay/${PAKASIR_SLUG}/${amount}?order_id=${orderId}&qris_only=1`;
};

// Generate unique order ID
export const generateOrderId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AQ${timestamp}${random}`;
};

// Create payment transaction - returns URL for the user to pay
export const createPaymentTransaction = async (
  amount: number,
  orderId: string
): Promise<{ success: boolean; payment?: { payment_url: string; qris_string?: string }; error?: string }> => {
  try {
    if (amount === 0) {
      return { success: false, error: "Invalid amount" };
    }
    
    const paymentUrl = getPaymentUrl(amount, orderId);
    
    return { 
      success: true, 
      payment: { 
        payment_url: paymentUrl,
        qris_string: paymentUrl
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create payment" };
  }
};

// Check payment status - placeholder (since we're using URL-based payment)
export const checkPaymentStatus = async (
  orderId: string,
  amount?: number
): Promise<{ success: boolean; transaction?: { status: "pending" | "completed" | "cancelled" }; error?: string }> => {
  // For URL-based payment, we can't check status programmatically
  // User must confirm payment manually
  return { success: true, transaction: { status: "pending" } };
};

// Check API status
export const checkAPIStatus = async (): Promise<APIStatus> => {
  const results: APIStatus = {
    chat: false,
    imageAnalysis: false,
    research: false,
    spotify: false,
    imageGeneration: false,
  };

  try {
    const response = await fetch(`${API_BASE}?text=ping&prompt=test&session=healthcheck`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    results.chat = response.ok;
    results.imageAnalysis = response.ok;
    results.research = response.ok;
  } catch {
    // API is down
  }

  try {
    const response = await fetch(`${SPOTIFY_API}?query=test`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    results.spotify = response.ok;
  } catch {
    // API is down
  }

  return results;
};
