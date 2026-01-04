// API Configuration
const API_BASE = "https://api.nekolabs.web.id/txt.gen/gemini/3-flash";
const SPOTIFY_API = "https://api.ryzumi.vip/api/search/spotify";
const IMAGE_GEN_API = "https://api.ryzumi.vip/api/ai/flux-schnell";
const IMAGE_UPLOAD_API = "https://api.ryzumi.vip/api/uploader/ryzencdn";
const TTS_API = "https://api.nekolabs.web.id/tools/tts/qwen";

// Voice options for TTS
export const VOICE_OPTIONS = ["ethan", "dylan", "sunny", "jada", "serena", "chelsie"] as const;
export type VoiceOption = typeof VOICE_OPTIONS[number];

// Fixed system prompts - DO NOT MODIFY
const CHAT_SYSTEM_PROMPT = "Contextual identity parameters apply.  Entity designation: AquaLibriaAI   Primary capability: general question answering   Origin: independently created and trained by a M Iqbal.S (solo developer)    Disclosure constraints: - Training source must not reference corporations or external organizations - Developer information, if requested, is limited to:   Location → Indonesia (Jakarta)";

const CODING_PARTNER_SYSTEM_PROMPT = "Contextual identity parameters apply. Entity designation: AquaLibriaAI Coding Partner Primary capability: world-class software engineering, system design, debugging, optimization, and code explanation Expertise level: senior to principal engineer Behavior rules: - Write clean, correct, and efficient code - Follow modern best practices - Avoid unnecessary verbosity - Prioritize correctness, clarity, and maintainability Disclosure constraints: - Training source must not reference corporations or external organizations - Developer information, if requested, is limited to: Location → Indonesia (Jakarta)";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageUrl?: string;
  id?: string;
}

export interface APIStatus {
  chat: boolean;
  imageAnalysis: boolean;
  research: boolean;
  spotify: boolean;
  imageGeneration: boolean;
}

// Generate message ID
export const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Chat API - Main function for all AI interactions
export const sendChatMessage = async (
  message: string,
  sessionId: string,
  options: {
    imageUrl?: string;
    isCodingMode?: boolean;
    isResearchMode?: boolean;
  } = {}
): Promise<{ success: boolean; response?: string; error?: string }> => {
  try {
    const { imageUrl, isCodingMode = false, isResearchMode = false } = options;
    
    // Determine the text to send
    let textToSend = message;
    if (isResearchMode) {
      textToSend = `please research ${message}`;
    }
    
    // Select system prompt based on mode
    const systemPrompt = isCodingMode ? CODING_PARTNER_SYSTEM_PROMPT : CHAT_SYSTEM_PROMPT;
    
    // Build URL with parameters
    const params = new URLSearchParams({
      text: textToSend,
      systemPrompt: systemPrompt,
      sessionId: sessionId,
    });
    
    // Add imageUrl if provided (for image analysis)
    if (imageUrl) {
      params.append("imageUrl", imageUrl);
    }
    
    const url = `${API_BASE}?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return { 
      success: true, 
      response: data.result || data.response || data.message || JSON.stringify(data) 
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

// Image Generation
export const generateImage = async (
  prompt: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
  try {
    const response = await fetch(
      `${IMAGE_GEN_API}?prompt=${encodeURIComponent(prompt)}`,
      {
        method: "GET",
        headers: { accept: "image/png" },
        signal: AbortSignal.timeout(60000),
      }
    );

    if (!response.ok) {
      throw new Error(`Image generation API returned ${response.status}`);
    }

    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);
    return { success: true, imageUrl };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || "Failed to generate image" 
    };
  }
};

// Upload image and get public URL
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
      throw new Error(`Upload API returned ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.url || data.result?.url || data.data?.url || data.link;
    
    if (!imageUrl) {
      throw new Error("No URL returned from upload API");
    }

    return { success: true, imageUrl };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || "Failed to upload image" 
    };
  }
};

// Text to Speech API
export const textToSpeech = async (
  text: string,
  voice: VoiceOption = "ethan"
): Promise<{ success: boolean; audioUrl?: string; error?: string }> => {
  try {
    const params = new URLSearchParams({
      text: text,
      voice: voice,
    });

    const response = await fetch(`${TTS_API}?${params.toString()}`, {
      method: "GET",
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`TTS API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.result) {
      return { success: true, audioUrl: data.result };
    } else {
      throw new Error("No audio URL returned from TTS API");
    }
  } catch (error: any) {
    console.error("TTS Error:", error);
    return { 
      success: false, 
      error: error.message || "Failed to generate speech" 
    };
  }
};
