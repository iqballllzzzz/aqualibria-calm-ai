import { ChatMessage } from "./api";

// ==================== INTERFACES ====================

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  isCodingPartner?: boolean;
}

export interface UserPreferences {
  aiName: string;
  personality: string;
  customPersonality: string;
  rememberName: boolean;
  rememberPreferences: boolean;
  rememberWritingStyle: boolean;
}

export interface AIMemory {
  // User Identity
  userName: string;
  userHabits: string[];
  userPreferences: string[];
  userDesires: string[];
  userGoals: string[];
  personalityTraits: string[];
  strengths: string[];
  weaknesses: string[];
  communicationStyle: string;
  
  // Conversational Memory
  recentTopics: string[];
  repeatedInterests: string[];
  conversationThemes: string[];
  importantFacts: string[];
  
  // Metadata
  lastUpdated: Date;
  totalInteractions: number;
}

export interface MessageReaction {
  messageId: string;
  sessionId: string;
  reaction: "like" | "dislike" | null;
}

// ==================== STORAGE KEYS ====================

const STORAGE_KEYS = {
  CHAT_HISTORY: "aqua-chat-history",
  PREFERENCES: "aqua-preferences",
  AI_MEMORY: "aqua-ai-memory",
  WELCOME_SHOWN: "aqua-welcome-shown",
  MESSAGE_REACTIONS: "aqua-message-reactions",
  CURRENT_SESSION: "aqua-current-session",
} as const;

// ==================== WELCOME STATE ====================

export const hasSeenWelcome = (): boolean => {
  return localStorage.getItem(STORAGE_KEYS.WELCOME_SHOWN) === "true";
};

export const setWelcomeShown = (): void => {
  localStorage.setItem(STORAGE_KEYS.WELCOME_SHOWN, "true");
};

// ==================== SESSION ID GENERATION ====================

export const generateSessionId = (): string => {
  // Generate proper UUID v4
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const generateSessionTitle = (firstMessage: string): string => {
  const cleaned = firstMessage.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= 50) return cleaned;
  return cleaned.substring(0, 50) + "...";
};

// ==================== CHAT HISTORY ====================

export const saveChatSession = (session: ChatSession): void => {
  const history = getChatHistory();
  const existingIndex = history.findIndex((s) => s.id === session.id);
  
  if (existingIndex >= 0) {
    history[existingIndex] = { ...session, updatedAt: new Date() };
  } else {
    history.unshift(session);
  }
  
  // Keep only last 100 sessions
  const trimmed = history.slice(0, 100);
  localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(trimmed));
};

export const getChatHistory = (): ChatSession[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
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
  localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(filtered));
};

export const clearAllChatHistory = (): void => {
  localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
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

export const getSessionById = (sessionId: string): ChatSession | null => {
  const history = getChatHistory();
  return history.find((s) => s.id === sessionId) || null;
};

// ==================== USER PREFERENCES ====================

export const getDefaultPreferences = (): UserPreferences => ({
  aiName: "AquaLibriaAI",
  personality: "balanced",
  customPersonality: "",
  rememberName: true,
  rememberPreferences: true,
  rememberWritingStyle: true,
});

export const savePreferences = (prefs: UserPreferences): void => {
  localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
};

export const getPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    if (!stored) return getDefaultPreferences();
    return { ...getDefaultPreferences(), ...JSON.parse(stored) };
  } catch {
    return getDefaultPreferences();
  }
};

// ==================== AI MEMORY SYSTEM ====================

export const getDefaultMemory = (): AIMemory => ({
  userName: "",
  userHabits: [],
  userPreferences: [],
  userDesires: [],
  userGoals: [],
  personalityTraits: [],
  strengths: [],
  weaknesses: [],
  communicationStyle: "",
  recentTopics: [],
  repeatedInterests: [],
  conversationThemes: [],
  importantFacts: [],
  lastUpdated: new Date(),
  totalInteractions: 0,
});

export const saveAIMemory = (memory: AIMemory): void => {
  const toSave = { ...memory, lastUpdated: new Date() };
  localStorage.setItem(STORAGE_KEYS.AI_MEMORY, JSON.stringify(toSave));
};

export const getAIMemory = (): AIMemory => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AI_MEMORY);
    if (!stored) return getDefaultMemory();
    const parsed = JSON.parse(stored);
    return { 
      ...getDefaultMemory(), 
      ...parsed, 
      lastUpdated: new Date(parsed.lastUpdated) 
    };
  } catch {
    return getDefaultMemory();
  }
};

export const updateAIMemory = (updates: Partial<AIMemory>): void => {
  const current = getAIMemory();
  const updated = { 
    ...current, 
    ...updates, 
    lastUpdated: new Date(),
    totalInteractions: current.totalInteractions + 1,
  };
  saveAIMemory(updated);
};

// Memory extraction from user messages
export const extractMemoryFromMessage = (message: string): void => {
  const memory = getAIMemory();
  const lowerMessage = message.toLowerCase();
  const updates: Partial<AIMemory> = {};
  
  // Extract user name
  const namePatterns = [
    /my name is (\w+)/i,
    /i'm (\w+)/i,
    /call me (\w+)/i,
    /i am (\w+)/i,
    /name's (\w+)/i,
  ];
  
  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length > 1 && match[1].length < 20) {
      const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      if (!['A', 'The', 'I', 'You', 'We', 'They', 'He', 'She', 'It'].includes(name)) {
        updates.userName = name;
        break;
      }
    }
  }
  
  // Extract goals
  const goalPatterns = [
    /i want to (.+?)(?:\.|$)/i,
    /my goal is (.+?)(?:\.|$)/i,
    /i'm trying to (.+?)(?:\.|$)/i,
    /i need to (.+?)(?:\.|$)/i,
    /i hope to (.+?)(?:\.|$)/i,
  ];
  
  for (const pattern of goalPatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length > 3 && match[1].length < 100) {
      const goal = match[1].trim();
      if (!memory.userGoals.includes(goal)) {
        updates.userGoals = [...memory.userGoals.slice(-9), goal];
      }
      break;
    }
  }
  
  // Extract preferences
  const prefPatterns = [
    /i (?:like|love|prefer|enjoy) (.+?)(?:\.|$)/i,
    /i'm (?:a fan of|into) (.+?)(?:\.|$)/i,
    /my favorite (?:is|are) (.+?)(?:\.|$)/i,
  ];
  
  for (const pattern of prefPatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length > 2 && match[1].length < 50) {
      const pref = match[1].trim();
      if (!memory.userPreferences.includes(pref)) {
        updates.userPreferences = [...memory.userPreferences.slice(-9), pref];
      }
      break;
    }
  }
  
  // Extract habits
  const habitPatterns = [
    /i usually (.+?)(?:\.|$)/i,
    /i always (.+?)(?:\.|$)/i,
    /i often (.+?)(?:\.|$)/i,
    /every (?:day|morning|night|week) i (.+?)(?:\.|$)/i,
  ];
  
  for (const pattern of habitPatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length > 3 && match[1].length < 80) {
      const habit = match[1].trim();
      if (!memory.userHabits.includes(habit)) {
        updates.userHabits = [...memory.userHabits.slice(-9), habit];
      }
      break;
    }
  }
  
  // Extract topics discussed
  const topicKeywords = ["about", "help with", "learn", "understand", "explain", "how to", "what is", "tell me"];
  for (const keyword of topicKeywords) {
    if (lowerMessage.includes(keyword)) {
      const topic = message.substring(0, 60).replace(/[^\w\s]/g, "").trim();
      if (topic && !memory.recentTopics.includes(topic)) {
        updates.recentTopics = [...memory.recentTopics.slice(-19), topic];
      }
      break;
    }
  }
  
  // Detect communication style preferences
  if (lowerMessage.includes("please") || lowerMessage.includes("thank you") || lowerMessage.includes("could you")) {
    if (!memory.communicationStyle.includes("polite")) {
      updates.communicationStyle = "polite and formal";
    }
  }
  
  // Update memory if we found anything
  if (Object.keys(updates).length > 0) {
    updateAIMemory(updates);
  }
};

// Build memory context for display (NOT for API - memory is implicit)
export const buildMemoryContext = (): string => {
  const memory = getAIMemory();
  const parts: string[] = [];
  
  if (memory.userName) {
    parts.push(`User's name: ${memory.userName}`);
  }
  
  if (memory.userPreferences.length > 0) {
    parts.push(`Preferences: ${memory.userPreferences.slice(-5).join(", ")}`);
  }
  
  if (memory.userGoals.length > 0) {
    parts.push(`Goals: ${memory.userGoals.slice(-3).join(", ")}`);
  }
  
  if (memory.recentTopics.length > 0) {
    parts.push(`Recent topics: ${memory.recentTopics.slice(-5).join(", ")}`);
  }
  
  return parts.join(" | ");
};

// ==================== MESSAGE REACTIONS ====================

export const getMessageReactions = (): MessageReaction[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.MESSAGE_REACTIONS);
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
  
  localStorage.setItem(STORAGE_KEYS.MESSAGE_REACTIONS, JSON.stringify(reactions));
};

export const getMessageReaction = (messageId: string, sessionId: string): "like" | "dislike" | null => {
  const reactions = getMessageReactions();
  const found = reactions.find(r => r.messageId === messageId && r.sessionId === sessionId);
  return found?.reaction ?? null;
};

// ==================== EXPORT/IMPORT ====================

export const exportChatHistory = (): string => {
  const data = {
    chatHistory: getChatHistory(),
    preferences: getPreferences(),
    memory: getAIMemory(),
    reactions: getMessageReactions(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
};

export const importChatHistory = (jsonString: string): boolean => {
  try {
    const parsed = JSON.parse(jsonString);
    
    if (parsed.chatHistory && Array.isArray(parsed.chatHistory)) {
      localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(parsed.chatHistory));
    }
    
    if (parsed.preferences) {
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(parsed.preferences));
    }
    
    if (parsed.memory) {
      localStorage.setItem(STORAGE_KEYS.AI_MEMORY, JSON.stringify(parsed.memory));
    }
    
    if (parsed.reactions) {
      localStorage.setItem(STORAGE_KEYS.MESSAGE_REACTIONS, JSON.stringify(parsed.reactions));
    }
    
    return true;
  } catch {
    return false;
  }
};

// ==================== CLEAR ALL DATA ====================

export const clearAllData = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};
