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
  rememberName: boolean;
  rememberPreferences: boolean;
  rememberWritingStyle: boolean;
  userName?: string;
}

const CHAT_HISTORY_KEY = "aqua-chat-history";
const PREFERENCES_KEY = "aqua-preferences";
const CURRENT_SESSION_KEY = "aqua-current-session";

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

// Generate session ID
export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Generate title from first message
export const generateSessionTitle = (firstMessage: string): string => {
  const cleaned = firstMessage.trim();
  if (cleaned.length <= 40) return cleaned;
  return cleaned.substring(0, 40) + "...";
};
