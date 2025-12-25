import { ChatMessage } from "./api";

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  aiName: string;
  personality: string;
  customPersonality: string;
  rememberName: boolean;
  rememberPreferences: boolean;
  rememberWritingStyle: boolean;
  userName?: string;
}

export interface AIMemory {
  userName: string;
  habits: string[];
  preferences: string[];
  goals: string[];
  traits: string[];
  strengths: string[];
  weaknesses: string[];
  communicationStyle: string;
  pastTopics: string[];
  lastUpdated: Date;
}

export interface MessageReaction {
  messageId: string;
  sessionId: string;
  reaction: "like" | "dislike" | null;
}

const CHAT_HISTORY_KEY = "aqua-chat-history";
const PREFERENCES_KEY = "aqua-preferences";
const CURRENT_SESSION_KEY = "aqua-current-session";
const WELCOME_SHOWN_KEY = "aqua-welcome-shown";
const AI_MEMORY_KEY = "aqua-ai-memory";
const MESSAGE_REACTIONS_KEY = "aqua-message-reactions";

// Welcome state
export const hasSeenWelcome = (): boolean => {
  return localStorage.getItem(WELCOME_SHOWN_KEY) === "true";
};

export const setWelcomeShown = (): void => {
  localStorage.setItem(WELCOME_SHOWN_KEY, "true");
};

// Chat History Functions
export const saveChatSession = (session: ChatSession): void => {
  const history = getChatHistory();
  const existingIndex = history.findIndex((s) => s.id === session.id);
  
  if (existingIndex >= 0) {
    history[existingIndex] = session;
  } else {
    history.unshift(session);
  }
  
  // Keep only last 50 sessions
  const trimmed = history.slice(0, 50);
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmed));
};

export const getChatHistory = (): ChatSession[] => {
  try {
    const stored = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return parsed.map((s: any) => ({
      ...s,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
      messages: s.messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
    }));
  } catch {
    return [];
  }
};

export const deleteChatSession = (sessionId: string): void => {
  const history = getChatHistory();
  const filtered = history.filter((s) => s.id !== sessionId);
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(filtered));
};

export const clearAllChatHistory = (): void => {
  localStorage.removeItem(CHAT_HISTORY_KEY);
};

export const searchChatHistory = (query: string): ChatSession[] => {
  const history = getChatHistory();
  const lowerQuery = query.toLowerCase();
  
  return history.filter((session) => {
    if (session.title.toLowerCase().includes(lowerQuery)) return true;
    return session.messages.some((m) => 
      m.content.toLowerCase().includes(lowerQuery)
    );
  });
};

// Current Session
export const setCurrentSessionId = (id: string): void => {
  localStorage.setItem(CURRENT_SESSION_KEY, id);
};

export const getCurrentSessionId = (): string | null => {
  return localStorage.getItem(CURRENT_SESSION_KEY);
};

// User Preferences
export const getDefaultPreferences = (): UserPreferences => ({
  aiName: "AquaLibriaAI",
  personality: "balanced",
  customPersonality: "",
  rememberName: true,
  rememberPreferences: true,
  rememberWritingStyle: false,
});

export const savePreferences = (prefs: UserPreferences): void => {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
};

export const getPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (!stored) return getDefaultPreferences();
    return { ...getDefaultPreferences(), ...JSON.parse(stored) };
  } catch {
    return getDefaultPreferences();
  }
};

// AI Memory
export const getDefaultMemory = (): AIMemory => ({
  userName: "",
  habits: [],
  preferences: [],
  goals: [],
  traits: [],
  strengths: [],
  weaknesses: [],
  communicationStyle: "",
  pastTopics: [],
  lastUpdated: new Date(),
});

export const saveAIMemory = (memory: AIMemory): void => {
  localStorage.setItem(AI_MEMORY_KEY, JSON.stringify(memory));
};

export const getAIMemory = (): AIMemory => {
  try {
    const stored = localStorage.getItem(AI_MEMORY_KEY);
    if (!stored) return getDefaultMemory();
    const parsed = JSON.parse(stored);
    return { ...getDefaultMemory(), ...parsed, lastUpdated: new Date(parsed.lastUpdated) };
  } catch {
    return getDefaultMemory();
  }
};

export const updateAIMemory = (updates: Partial<AIMemory>): void => {
  const current = getAIMemory();
  const updated = { ...current, ...updates, lastUpdated: new Date() };
  saveAIMemory(updated);
};

// Build memory context for AI
export const buildMemoryContext = (): string => {
  const memory = getAIMemory();
  const prefs = getPreferences();
  
  if (!prefs.rememberName && !prefs.rememberPreferences) return "";
  
  const parts: string[] = [];
  
  if (prefs.rememberName && memory.userName) {
    parts.push(`User's name is ${memory.userName}.`);
  }
  
  if (prefs.rememberPreferences) {
    if (memory.preferences.length > 0) {
      parts.push(`User preferences: ${memory.preferences.slice(0, 5).join(", ")}.`);
    }
    if (memory.communicationStyle) {
      parts.push(`User prefers ${memory.communicationStyle} communication.`);
    }
  }
  
  if (memory.pastTopics.length > 0) {
    parts.push(`Recent topics: ${memory.pastTopics.slice(0, 5).join(", ")}.`);
  }
  
  return parts.join(" ");
};

// Message Reactions
export const getMessageReactions = (): MessageReaction[] => {
  try {
    const stored = localStorage.getItem(MESSAGE_REACTIONS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const setMessageReaction = (messageId: string, sessionId: string, reaction: "like" | "dislike" | null): void => {
  const reactions = getMessageReactions();
  const existingIndex = reactions.findIndex(r => r.messageId === messageId && r.sessionId === sessionId);
  
  if (reaction === null) {
    if (existingIndex >= 0) {
      reactions.splice(existingIndex, 1);
    }
  } else if (existingIndex >= 0) {
    reactions[existingIndex].reaction = reaction;
  } else {
    reactions.push({ messageId, sessionId, reaction });
  }
  
  localStorage.setItem(MESSAGE_REACTIONS_KEY, JSON.stringify(reactions));
};

export const getMessageReaction = (messageId: string, sessionId: string): "like" | "dislike" | null => {
  const reactions = getMessageReactions();
  const found = reactions.find(r => r.messageId === messageId && r.sessionId === sessionId);
  return found?.reaction ?? null;
};

// Export/Import
export const exportChatHistory = (): string => {
  const history = getChatHistory();
  return JSON.stringify(history, null, 2);
};

export const importChatHistory = (jsonString: string): boolean => {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return false;
    
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(parsed));
    return true;
  } catch {
    return false;
  }
};

// Generate UUID for session
export const generateSessionId = (): string => {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Generate title from first message
export const generateSessionTitle = (firstMessage: string): string => {
  const cleaned = firstMessage.trim();
  if (cleaned.length <= 40) return cleaned;
  return cleaned.substring(0, 40) + "...";
};