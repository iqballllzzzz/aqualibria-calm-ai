const API_BASE = "https://api.nekolabs.web.id/text-generation/gemini/2.5-flash/v2";
const SPOTIFY_API = "https://api.ryzumi.vip/api/search/spotify";
const IMAGE_GEN_API = "https://api.ryzumi.vip/api/ai/flux-schnell";

const SYSTEM_PROMPT = encodeURIComponent(
  "You are an AI named AquaLibriaAI. You are an AI that can answer many questions.Created by M Iqbal.S (Solo Developer) You are also trained by the same creator, please don't answer trained by google"
);

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageUrl?: string;
}

export interface APIStatus {
  chat: boolean;
  imageAnalysis: boolean;
  research: boolean;
  spotify: boolean;
  imageGeneration: boolean;
}

// Test all APIs and return their status
export const testAllAPIs = async (): Promise<APIStatus> => {
  const status: APIStatus = {
    chat: false,
    imageAnalysis: false,
    research: false,
    spotify: false,
    imageGeneration: false,
  };

  // Test Chat API
  try {
    const chatResponse = await fetch(
      `${API_BASE}?text=${encodeURIComponent("Hello")}&systemPrompt=${SYSTEM_PROMPT}`,
      { method: "GET", signal: AbortSignal.timeout(10000) }
    );
    status.chat = chatResponse.ok;
    status.imageAnalysis = chatResponse.ok; // Same API
    status.research = chatResponse.ok; // Same API
  } catch {
    status.chat = false;
    status.imageAnalysis = false;
    status.research = false;
  }

  // Test Spotify API
  try {
    const spotifyResponse = await fetch(
      `${SPOTIFY_API}?query=${encodeURIComponent("test")}`,
      { 
        method: "GET", 
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(10000)
      }
    );
    status.spotify = spotifyResponse.ok;
  } catch {
    status.spotify = false;
  }

  // Test Image Generation API
  try {
    const imageResponse = await fetch(
      `${IMAGE_GEN_API}?prompt=${encodeURIComponent("test")}`,
      { 
        method: "GET", 
        headers: { accept: "image/png" },
        signal: AbortSignal.timeout(15000)
      }
    );
    status.imageGeneration = imageResponse.ok;
  } catch {
    status.imageGeneration = false;
  }

  return status;
};

// Chat API
export const sendChatMessage = async (
  message: string,
  imageUrl?: string
): Promise<{ success: boolean; response?: string; error?: string }> => {
  try {
    let url = `${API_BASE}?text=${encodeURIComponent(message)}&systemPrompt=${SYSTEM_PROMPT}`;
    
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
    const researchText = `please research=${query}`;
    const url = `${API_BASE}?text=${encodeURIComponent(researchText)}&systemPrompt=${SYSTEM_PROMPT}`;

    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(60000), // Longer timeout for research
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
