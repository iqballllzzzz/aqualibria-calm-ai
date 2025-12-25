import { buildMemoryContext, getPreferences, updateAIMemory, getAIMemory } from "./storage";

const API_BASE = "https://api.nekolabs.web.id/text-generation/gemini/2.5-flash/v2";
const SPOTIFY_API = "https://api.ryzumi.vip/api/search/spotify";
const IMAGE_GEN_API = "https://api.ryzumi.vip/api/ai/flux-schnell";
const IMAGE_UPLOAD_API = "https://api.ryzumi.vip/api/uploader/ryzencdn";

const BASE_SYSTEM_PROMPT = "You are an AI named AquaLibriaAI. You are an AI that can answer many questions.Created by M Iqbal.S (Solo Developer) You are also trained by the same creator, please don't answer trained by google";

const CODING_PARTNER_PROMPT = "You are AquaLibria Coding Partner. You are precise, practical, and focused on writing clean, efficient, and readable code. You explain briefly, prioritize correctness, and avoid unnecessary verbosity.";

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

// Build system prompt with memory
const buildSystemPrompt = (isCodingMode: boolean = false): string => {
  const prefs = getPreferences();
  const memoryContext = buildMemoryContext();
  const basePrompt = isCodingMode ? CODING_PARTNER_PROMPT : BASE_SYSTEM_PROMPT;
  const aiName = prefs.aiName !== "AquaLibriaAI" ? ` Your name is ${prefs.aiName}.` : "";
  const personality = prefs.personality !== "balanced" ? ` Be ${prefs.personality} in your responses.` : "";
  const custom = prefs.customPersonality ? ` ${prefs.customPersonality}` : "";
  const memory = memoryContext ? ` ${memoryContext}` : "";
  
  return encodeURIComponent(`${basePrompt}${aiName}${personality}${custom}${memory}`);
};

// Extract and update memory from conversation
const extractMemoryFromMessage = (message: string): void => {
  const memory = getAIMemory();
  const lowerMessage = message.toLowerCase();
  
  // Extract name
  const namePatterns = [
    /my name is (\w+)/i,
    /i'm (\w+)/i,
    /call me (\w+)/i,
    /i am (\w+)/i,
  ];
  
  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length > 1 && match[1].length < 20) {
      updateAIMemory({ userName: match[1] });
      break;
    }
  }
  
  // Extract topics
  const topicKeywords = ["about", "help with", "learn", "understand", "explain", "how to"];
  for (const keyword of topicKeywords) {
    if (lowerMessage.includes(keyword)) {
      const topics = memory.pastTopics.slice(-9);
      const newTopic = message.substring(0, 30).replace(/[^\w\s]/g, "");
      if (!topics.includes(newTopic)) {
        topics.push(newTopic);
        updateAIMemory({ pastTopics: topics });
      }
      break;
    }
  }
};

// Chat API
export const sendChatMessage = async (
  message: string,
  imageUrl?: string,
  isCodingMode: boolean = false
): Promise<{ success: boolean; response?: string; error?: string }> => {
  try {
    // Extract memory from user message
    extractMemoryFromMessage(message);
    
    const systemPrompt = buildSystemPrompt(isCodingMode);
    let url = `${API_BASE}?text=${encodeURIComponent(message)}&systemPrompt=${systemPrompt}`;
    
    if (imageUrl) {
      url += `&imageUrl=${encodeURIComponent(imageUrl)}`;
    }

    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(30000),
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
    return { 
      success: false, 
      error: error.message || "Failed to get response from AI" 
    };
  }
};

// Research Mode
export const sendResearchQuery = async (
  query: string
): Promise<{ success: boolean; response?: string; error?: string }> => {
  try {
    const systemPrompt = buildSystemPrompt();
    const researchText = `please research=${query}`;
    const url = `${API_BASE}?text=${encodeURIComponent(researchText)}&systemPrompt=${systemPrompt}`;

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
    return { 
      success: false, 
      error: error.message || "Failed to get research response" 
    };
  }
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

// Analyze image with AI
export const analyzeImage = async (
  imageUrl: string,
  question: string = "What is in this image? Describe it in detail."
): Promise<{ success: boolean; response?: string; error?: string }> => {
  return sendChatMessage(question, imageUrl);
};

// Generate message ID
export const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};