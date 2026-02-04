// API Configuration - Updated to Gemini API
const API_BASE = "https://api.ryzumi.vip/api/ai/gemini";
const SPOTIFY_API = "https://api.ryzumi.vip/api/search/spotify";
const IMAGE_GEN_API = "https://api.nexray.web.id/ai/v1/text2image";
const IMAGE_UPLOAD_API = "https://api.ryzumi.vip/api/uploader/ryzumicdn";
const IMAGE_EDIT_API = "https://api.nekolabs.web.id/image.gen/qwen/image-edit";
const QWEN_TTS_API = "https://api.ryzumi.vip/api/ai/tts-gemini";
const HUGGINGFACE_TTS_API = "https://api-inference.huggingface.co/models/espnet/kan-bayashi_ljspeech_vits";
// Voice options for TTS - Using Qwen3 voices
export const VOICE_OPTIONS_MAP: Record<string, { displayName: string; gender: "male" | "female"; description: string }> = {
  Fenrir: { displayName: "Ethan", gender: "male", description: "Deep & confident" },
  Leda: { displayName: "Sophia", gender: "female", description: "Warm & elegant" },
  Zephyr: { displayName: "Alex", gender: "male", description: "Calm & smooth" },
  Aoede: { displayName: "Luna", gender: "female", description: "Melodic & soft" },
  Charon: { displayName: "Marcus", gender: "male", description: "Strong & deep" },
  Kore: { displayName: "Emma", gender: "female", description: "Gentle & clear" },
  Puck: { displayName: "Oliver", gender: "male", description: "Light & friendly" },
  Orus: { displayName: "Ava", gender: "female", description: "Warm & expressive" },
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
    dailyLimit: 40, // 40 per 2 minutes
    model: "aqualibriav1",
    modelDisplay: "AqualibriaV1",
    features: [
      "40 requests / 2 menit",
      "Basic AI responses",
      "Image upload & analysis",
      "Image generation",
      "LatentLeaf (10x / 7 menit)",
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

// LatentLeaf Image Edit - Premium feature for Senior and Superior plans
export const editImageLatentLeaf = async (
  prompt: string,
  imageUrl: string
): Promise<{ success: boolean; editedImageUrl?: string; error?: string }> => {
  try {
    const params = new URLSearchParams({
      prompt: prompt,
      imageUrl: imageUrl,
    });

    const response = await fetch(`${IMAGE_EDIT_API}?${params.toString()}`, {
      method: "GET",
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      throw new Error(`Image edit API returned ${response.status}`);
    }

    const data = await response.json();
    const editedUrl = data.result?.url || data.url || data.image || data.result;
    
    if (!editedUrl) {
      throw new Error("No edited image URL returned");
    }

    return { success: true, editedImageUrl: editedUrl };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || "Failed to edit image" 
    };
  }
};

// Text to Speech API - returns audio blob URL
export const textToSpeech = async (
  text: string,
  voice: VoiceOption = "Fenrir"
): Promise<{ success: boolean; audioUrl?: string; error?: string }> => {
  try {
    const params = new URLSearchParams({
      text: text,
      style: "default",
      voice: voice,
    });

    const response = await fetch(`${QWEN_TTS_API}?${params.toString()}`, {
      method: "GET",
      headers: { accept: "audio/wav" },
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      throw new Error(`TTS API returned ${response.status}`);
    }

    // Create blob URL from audio response
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    return { success: true, audioUrl };
  } catch (error: any) {
    console.error("TTS Error:", error);
    return { 
      success: false, 
      error: error.message || "Failed to generate speech" 
    };
  }
};

// Pakasir Payment Integration
const PAKASIR_SLUG = "aqualibria";
const PAKASIR_API_KEY = "gi2fPnZQlH8ytZJK6T5jpFEM7qHuh2aN";
const PAKASIR_BASE_URL = "https://app.pakasir.com";

export interface PaymentTransaction {
  orderId: string;
  amount: number;
  plan: PlanType;
  status: "pending" | "completed" | "cancelled";
  qrString?: string;
  expiredAt?: string;
  paymentMethod?: string;
  totalPayment?: number;
  fee?: number;
}

// Create QRIS payment transaction using Pakasir API
export const createPaymentTransaction = async (
  amount: number,
  orderId: string
): Promise<{ success: boolean; payment?: any; error?: string }> => {
  try {
    console.log("Creating payment:", { amount, orderId, project: PAKASIR_SLUG });
    
    const response = await fetch(`${PAKASIR_BASE_URL}/api/transactioncreate/qris`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project: PAKASIR_SLUG,
        order_id: orderId,
        amount: amount,
        api_key: PAKASIR_API_KEY,
      }),
      signal: AbortSignal.timeout(30000),
    });

    const responseText = await response.text();
    console.log("Pakasir response:", response.status, responseText);
    
    if (!response.ok) {
      throw new Error(`Payment API returned ${response.status}: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    
    // Response format: { payment: { project, order_id, amount, fee, total_payment, payment_method, payment_number, expired_at } }
    if (data.payment) {
      return { 
        success: true, 
        payment: {
          ...data.payment,
          qrString: data.payment.payment_number,
          expiredAt: data.payment.expired_at,
          totalPayment: data.payment.total_payment,
        }
      };
    }
    
    return { success: true, payment: data };
  } catch (error: any) {
    console.error("Payment creation error:", error);
    return { 
      success: false, 
      error: error.message || "Failed to create payment" 
    };
  }
};

export const checkPaymentStatus = async (
  orderId: string,
  amount: number
): Promise<{ success: boolean; transaction?: any; error?: string }> => {
  try {
    const params = new URLSearchParams({
      project: PAKASIR_SLUG,
      order_id: orderId,
      amount: amount.toString(),
      api_key: PAKASIR_API_KEY,
    });

    const response = await fetch(
      `https://app.pakasir.com/api/transactiondetail?${params.toString()}`,
      {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      throw new Error(`Payment status API returned ${response.status}`);
    }

    const data = await response.json();
    return { success: true, transaction: data.transaction };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || "Failed to check payment status" 
    };
  }
};

export const getPaymentUrl = (amount: number, orderId: string, qrisOnly: boolean = true): string => {
  let url = `https://app.pakasir.com/pay/aqualibria/${amount}?order_id=${orderId}`;
  if (qrisOnly) {
    url += "&qris_only=1";
  }
  return url;
};

// HuggingFace TTS API - Fallback TTS using espnet model
export const textToSpeechHF = async (
  text: string
): Promise<{ success: boolean; audioUrl?: string; error?: string }> => {
  try {
    // Clean text for TTS
    const cleanText = text.replace(/[*#_`]/g, "").slice(0, 500);
    
    const response = await fetch(HUGGINGFACE_TTS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: cleanText }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("HuggingFace TTS error:", response.status, errorText);
      throw new Error(`HuggingFace TTS API returned ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    return { success: true, audioUrl };
  } catch (error: any) {
    console.error("HuggingFace TTS Error:", error);
    return { 
      success: false, 
      error: error.message || "Failed to generate speech" 
    };
  }
};

// Combined TTS with fallback: Try primary API first, then HuggingFace
export const textToSpeechWithFallback = async (
  text: string,
  voice: VoiceOption = "Fenrir"
): Promise<{ success: boolean; audioUrl?: string; error?: string }> => {
  // Try primary TTS first
  const primaryResult = await textToSpeech(text, voice);
  if (primaryResult.success) {
    return primaryResult;
  }
  
  console.log("Primary TTS failed, trying HuggingFace fallback...");
  
  // Fallback to HuggingFace
  return textToSpeechHF(text);
};
