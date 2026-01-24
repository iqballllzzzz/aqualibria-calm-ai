import { ChatMessage, PlanType } from "./api";

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
  
  // Long-term context for AI
  conversationHistory: string[];
  keyMoments: string[];
  emotionalState: string;
  
  // Metadata
  lastUpdated: Date;
  totalInteractions: number;
}

export interface MessageReaction {
  messageId: string;
  sessionId: string;
  reaction: "like" | "dislike" | null;
}

// Subscription & Usage
export interface UserSubscription {
  plan: PlanType;
  purchasedAt?: Date;
  expiresAt?: Date;
  orderId?: string;
}

export interface UsageData {
  date: string; // YYYY-MM-DD
  count: number;
  windowStart?: number; // timestamp for rate limiting window
  windowCount?: number; // count within window
}

// LatentLeaf Usage for Free Users
export interface LatentLeafUsage {
  windowStart: number; // timestamp
  count: number;
}

// LatentLeaf Image Edit Memory
export interface ImageEditSession {
  lastImageUrl: string;
  editHistory: { prompt: string; resultUrl: string; timestamp: Date }[];
}

// Chat Management
export interface ChatManagement {
  pinnedSessions: string[];
  archivedSessions: string[];
}

// ==================== STORAGE KEYS ====================

const STORAGE_KEYS = {
  CHAT_HISTORY: "aqua-chat-history",
  PREFERENCES: "aqua-preferences",
  AI_MEMORY: "aqua-ai-memory",
  WELCOME_SHOWN: "aqua-welcome-shown",
  MESSAGE_REACTIONS: "aqua-message-reactions",
  CURRENT_SESSION: "aqua-current-session",
  SUBSCRIPTION: "aqua-subscription",
  DAILY_USAGE: "aqua-daily-usage",
  RATE_LIMIT_USAGE: "aqua-rate-limit-usage",
  LATENTLEAF_USAGE: "aqua-latentleaf-usage",
  IMAGE_EDIT_SESSION: "aqua-image-edit-session",
  CHAT_MANAGEMENT: "aqua-chat-management",
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
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
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
  
  // Also remove from management lists
  const management = getChatManagement();
  management.pinnedSessions = management.pinnedSessions.filter(id => id !== sessionId);
  management.archivedSessions = management.archivedSessions.filter(id => id !== sessionId);
  saveChatManagement(management);
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

export const renameSession = (sessionId: string, newTitle: string): void => {
  const history = getChatHistory();
  const index = history.findIndex(s => s.id === sessionId);
  if (index >= 0) {
    history[index].title = newTitle;
    history[index].updatedAt = new Date();
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(history));
  }
};

// ==================== CHAT MANAGEMENT (PIN/ARCHIVE) ====================

export const getChatManagement = (): ChatManagement => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CHAT_MANAGEMENT);
    if (!stored) return { pinnedSessions: [], archivedSessions: [] };
    return JSON.parse(stored);
  } catch {
    return { pinnedSessions: [], archivedSessions: [] };
  }
};

export const saveChatManagement = (management: ChatManagement): void => {
  localStorage.setItem(STORAGE_KEYS.CHAT_MANAGEMENT, JSON.stringify(management));
};

export const togglePinSession = (sessionId: string): void => {
  const management = getChatManagement();
  const index = management.pinnedSessions.indexOf(sessionId);
  if (index >= 0) {
    management.pinnedSessions.splice(index, 1);
  } else {
    management.pinnedSessions.push(sessionId);
  }
  saveChatManagement(management);
};

export const toggleArchiveSession = (sessionId: string): void => {
  const management = getChatManagement();
  const index = management.archivedSessions.indexOf(sessionId);
  if (index >= 0) {
    management.archivedSessions.splice(index, 1);
  } else {
    management.archivedSessions.push(sessionId);
    // Remove from pinned if archived
    management.pinnedSessions = management.pinnedSessions.filter(id => id !== sessionId);
  }
  saveChatManagement(management);
};

export const restoreArchivedSession = (sessionId: string): void => {
  const management = getChatManagement();
  management.archivedSessions = management.archivedSessions.filter(id => id !== sessionId);
  saveChatManagement(management);
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

// ==================== AI MEMORY SYSTEM (ENHANCED - MUCH SMARTER) ====================

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
  conversationHistory: [],
  keyMoments: [],
  emotionalState: "neutral",
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

// Enhanced memory extraction from user messages
export const extractMemoryFromMessage = (message: string, isAIResponse: boolean = false): void => {
  const memory = getAIMemory();
  const lowerMessage = message.toLowerCase();
  const updates: Partial<AIMemory> = {};
  
  // Store conversation snippets for context
  const snippet = message.slice(0, 200);
  updates.conversationHistory = [...memory.conversationHistory.slice(-49), snippet];
  
  if (isAIResponse) {
    // Don't extract identity from AI responses
    return;
  }
  
  // Extract user name with more patterns
  const namePatterns = [
    /my name is (\w+)/i,
    /i'm (\w+)/i,
    /call me (\w+)/i,
    /i am (\w+)/i,
    /name's (\w+)/i,
    /nama saya (\w+)/i,
    /panggil saya (\w+)/i,
    /nama aku (\w+)/i,
  ];
  
  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length > 1 && match[1].length < 20) {
      const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      if (!['A', 'The', 'I', 'You', 'We', 'They', 'He', 'She', 'It', 'Is', 'Am'].includes(name)) {
        updates.userName = name;
        break;
      }
    }
  }
  
  // Extract goals (expanded patterns)
  const goalPatterns = [
    /i want to (.+?)(?:\.|$)/i,
    /my goal is (.+?)(?:\.|$)/i,
    /i'm trying to (.+?)(?:\.|$)/i,
    /i need to (.+?)(?:\.|$)/i,
    /i hope to (.+?)(?:\.|$)/i,
    /saya ingin (.+?)(?:\.|$)/i,
    /tujuan saya (.+?)(?:\.|$)/i,
    /aku mau (.+?)(?:\.|$)/i,
  ];
  
  for (const pattern of goalPatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length > 3 && match[1].length < 100) {
      const goal = match[1].trim();
      if (!memory.userGoals.includes(goal)) {
        updates.userGoals = [...memory.userGoals.slice(-14), goal];
      }
      break;
    }
  }
  
  // Extract preferences
  const prefPatterns = [
    /i (?:like|love|prefer|enjoy) (.+?)(?:\.|$)/i,
    /i'm (?:a fan of|into) (.+?)(?:\.|$)/i,
    /my favorite (?:is|are) (.+?)(?:\.|$)/i,
    /saya suka (.+?)(?:\.|$)/i,
    /aku suka (.+?)(?:\.|$)/i,
    /favorit saya (.+?)(?:\.|$)/i,
  ];
  
  for (const pattern of prefPatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length > 2 && match[1].length < 50) {
      const pref = match[1].trim();
      if (!memory.userPreferences.includes(pref)) {
        updates.userPreferences = [...memory.userPreferences.slice(-14), pref];
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
    /biasanya saya (.+?)(?:\.|$)/i,
    /saya selalu (.+?)(?:\.|$)/i,
  ];
  
  for (const pattern of habitPatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length > 3 && match[1].length < 80) {
      const habit = match[1].trim();
      if (!memory.userHabits.includes(habit)) {
        updates.userHabits = [...memory.userHabits.slice(-14), habit];
      }
      break;
    }
  }
  
  // Extract emotional state
  const emotionPatterns: { pattern: RegExp; emotion: string }[] = [
    { pattern: /i('m| am) (happy|excited|thrilled)/i, emotion: "positive" },
    { pattern: /i('m| am) (sad|depressed|down)/i, emotion: "sad" },
    { pattern: /i('m| am) (angry|frustrated|annoyed)/i, emotion: "frustrated" },
    { pattern: /i('m| am) (worried|anxious|stressed)/i, emotion: "anxious" },
    { pattern: /i('m| am) (bored|tired)/i, emotion: "tired" },
    { pattern: /i feel (great|good|amazing)/i, emotion: "positive" },
    { pattern: /saya (senang|gembira|bahagia)/i, emotion: "positive" },
    { pattern: /saya (sedih|kecewa)/i, emotion: "sad" },
    { pattern: /saya (marah|kesal)/i, emotion: "frustrated" },
  ];
  
  for (const { pattern, emotion } of emotionPatterns) {
    if (pattern.test(lowerMessage)) {
      updates.emotionalState = emotion;
      break;
    }
  }
  
  // Extract topics discussed
  const topicKeywords = ["about", "help with", "learn", "understand", "explain", "how to", "what is", "tell me", "tentang", "bantu", "jelaskan"];
  for (const keyword of topicKeywords) {
    if (lowerMessage.includes(keyword)) {
      const topic = message.substring(0, 80).replace(/[^\w\s]/g, "").trim();
      if (topic && !memory.recentTopics.includes(topic)) {
        updates.recentTopics = [...memory.recentTopics.slice(-29), topic];
      }
      break;
    }
  }
  
  // Detect communication style
  if (lowerMessage.includes("please") || lowerMessage.includes("thank you") || lowerMessage.includes("could you") || lowerMessage.includes("tolong") || lowerMessage.includes("terima kasih")) {
    if (!memory.communicationStyle.includes("polite")) {
      updates.communicationStyle = "polite and formal";
    }
  }
  
  // Extract key moments (important information)
  const importantPatterns = [
    /remember that (.+?)(?:\.|$)/i,
    /important: (.+?)(?:\.|$)/i,
    /don't forget (.+?)(?:\.|$)/i,
    /ingat bahwa (.+?)(?:\.|$)/i,
    /penting: (.+?)(?:\.|$)/i,
  ];
  
  for (const pattern of importantPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      updates.keyMoments = [...memory.keyMoments.slice(-9), match[1].trim()];
      break;
    }
  }
  
  // Update memory if we found anything
  if (Object.keys(updates).length > 0) {
    updateAIMemory(updates);
  }
};

// Build ENHANCED memory context for API (much richer context for smarter AI)
export const buildMemoryContext = (): string => {
  const memory = getAIMemory();
  const parts: string[] = [];
  
  // User identity
  if (memory.userName) {
    parts.push(`User's name is ${memory.userName}`);
  }
  
  // Emotional awareness
  if (memory.emotionalState && memory.emotionalState !== "neutral") {
    parts.push(`User's current mood: ${memory.emotionalState}`);
  }
  
  // Preferences (expanded)
  if (memory.userPreferences.length > 0) {
    parts.push(`User likes/prefers: ${memory.userPreferences.slice(-5).join(", ")}`);
  }
  
  // Goals (expanded)
  if (memory.userGoals.length > 0) {
    parts.push(`User's goals: ${memory.userGoals.slice(-4).join(", ")}`);
  }
  
  // Habits
  if (memory.userHabits.length > 0) {
    parts.push(`User's habits: ${memory.userHabits.slice(-3).join(", ")}`);
  }
  
  // Recent conversation topics (more context)
  if (memory.recentTopics.length > 0) {
    parts.push(`Recent discussion topics: ${memory.recentTopics.slice(-5).join(", ")}`);
  }
  
  // Key moments/important facts
  if (memory.keyMoments.length > 0) {
    parts.push(`Important to remember: ${memory.keyMoments.slice(-3).join("; ")}`);
  }
  
  // Important facts
  if (memory.importantFacts.length > 0) {
    parts.push(`Known facts about user: ${memory.importantFacts.slice(-3).join("; ")}`);
  }
  
  // Communication style
  if (memory.communicationStyle) {
    parts.push(`User communication style: ${memory.communicationStyle}`);
  }
  
  // Conversation history snippets for context
  if (memory.conversationHistory.length > 0) {
    const recentHistory = memory.conversationHistory.slice(-3).join(" ... ");
    parts.push(`Recent conversation context: ${recentHistory.slice(0, 300)}`);
  }
  
  // Personality traits
  if (memory.personalityTraits.length > 0) {
    parts.push(`User personality: ${memory.personalityTraits.slice(-3).join(", ")}`);
  }
  
  // Total interactions for relationship context
  if (memory.totalInteractions > 10) {
    parts.push(`This is interaction #${memory.totalInteractions} with this user`);
  }
  
  return parts.join(". ") + (parts.length > 0 ? "." : "");
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

// ==================== SUBSCRIPTION MANAGEMENT ====================

export const getSubscription = (): UserSubscription => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
    if (!stored) return { plan: "junior" };
    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      purchasedAt: parsed.purchasedAt ? new Date(parsed.purchasedAt) : undefined,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
    };
  } catch {
    return { plan: "junior" };
  }
};

export const saveSubscription = (subscription: UserSubscription): void => {
  localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(subscription));
};

export const upgradePlan = (plan: PlanType, orderId: string): void => {
  const now = new Date();
  // Plans are lifetime for simplicity, but can add expiry logic
  saveSubscription({
    plan,
    purchasedAt: now,
    orderId,
  });
};

// ==================== USAGE TRACKING (Updated with Rate Limits) ====================

// Rate limit windows: Free = 40 per 2 min, Senior = 1000/day, Superior = unlimited
const RATE_LIMIT_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const FREE_RATE_LIMIT = 40;

export const getRateLimitUsage = (): { windowStart: number; count: number } => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RATE_LIMIT_USAGE);
    if (!stored) return { windowStart: Date.now(), count: 0 };
    return JSON.parse(stored);
  } catch {
    return { windowStart: Date.now(), count: 0 };
  }
};

export const getTodayUsage = (): number => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(STORAGE_KEYS.DAILY_USAGE);
    if (!stored) return 0;
    const usage: UsageData = JSON.parse(stored);
    if (usage.date !== today) return 0;
    return usage.count;
  } catch {
    return 0;
  }
};

export const incrementUsage = (): number => {
  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();
  
  // Update daily usage
  let currentCount = getTodayUsage();
  const stored = localStorage.getItem(STORAGE_KEYS.DAILY_USAGE);
  if (stored) {
    const usage: UsageData = JSON.parse(stored);
    if (usage.date !== today) {
      currentCount = 0;
    }
  }
  const newDailyCount = currentCount + 1;
  localStorage.setItem(STORAGE_KEYS.DAILY_USAGE, JSON.stringify({
    date: today,
    count: newDailyCount,
  }));
  
  // Update rate limit window
  const rateLimitData = getRateLimitUsage();
  if (now - rateLimitData.windowStart > RATE_LIMIT_WINDOW_MS) {
    // Reset window
    localStorage.setItem(STORAGE_KEYS.RATE_LIMIT_USAGE, JSON.stringify({
      windowStart: now,
      count: 1,
    }));
  } else {
    localStorage.setItem(STORAGE_KEYS.RATE_LIMIT_USAGE, JSON.stringify({
      windowStart: rateLimitData.windowStart,
      count: rateLimitData.count + 1,
    }));
  }
  
  return newDailyCount;
};

export const canUseFeature = (): { allowed: boolean; remaining: number | "unlimited"; waitTime?: number } => {
  const subscription = getSubscription();
  const now = Date.now();
  
  if (subscription.plan === "superior") {
    return { allowed: true, remaining: "unlimited" };
  }
  
  if (subscription.plan === "senior") {
    const usage = getTodayUsage();
    const remaining = 1000 - usage;
    return { 
      allowed: remaining > 0, 
      remaining: Math.max(0, remaining) 
    };
  }
  
  // Free/Junior plan - 40 per 2 minutes
  const rateLimitData = getRateLimitUsage();
  
  // Check if window expired
  if (now - rateLimitData.windowStart > RATE_LIMIT_WINDOW_MS) {
    return { allowed: true, remaining: FREE_RATE_LIMIT };
  }
  
  const remaining = FREE_RATE_LIMIT - rateLimitData.count;
  if (remaining <= 0) {
    const waitTime = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - rateLimitData.windowStart)) / 1000);
    return { allowed: false, remaining: 0, waitTime };
  }
  
  return { allowed: true, remaining };
};

// ==================== LATENTLEAF USAGE (Free: 10x per 7 min) ====================

const LATENTLEAF_WINDOW_MS = 7 * 60 * 1000; // 7 minutes
const LATENTLEAF_FREE_LIMIT = 10;

export const getLatentLeafUsage = (): LatentLeafUsage => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LATENTLEAF_USAGE);
    if (!stored) return { windowStart: Date.now(), count: 0 };
    return JSON.parse(stored);
  } catch {
    return { windowStart: Date.now(), count: 0 };
  }
};

export const incrementLatentLeafUsage = (): void => {
  const now = Date.now();
  const current = getLatentLeafUsage();
  
  if (now - current.windowStart > LATENTLEAF_WINDOW_MS) {
    localStorage.setItem(STORAGE_KEYS.LATENTLEAF_USAGE, JSON.stringify({
      windowStart: now,
      count: 1,
    }));
  } else {
    localStorage.setItem(STORAGE_KEYS.LATENTLEAF_USAGE, JSON.stringify({
      windowStart: current.windowStart,
      count: current.count + 1,
    }));
  }
};

export const canUseLatentLeaf = (): { allowed: boolean; remaining: number; waitTime?: number; unlimited?: boolean } => {
  const subscription = getSubscription();
  
  // Senior and Superior have unlimited LatentLeaf
  if (subscription.plan === "senior" || subscription.plan === "superior") {
    return { allowed: true, remaining: 999, unlimited: true };
  }
  
  // Free plan - 10 per 7 minutes
  const now = Date.now();
  const usage = getLatentLeafUsage();
  
  // Check if window expired
  if (now - usage.windowStart > LATENTLEAF_WINDOW_MS) {
    return { allowed: true, remaining: LATENTLEAF_FREE_LIMIT };
  }
  
  const remaining = LATENTLEAF_FREE_LIMIT - usage.count;
  if (remaining <= 0) {
    const waitTime = Math.ceil((LATENTLEAF_WINDOW_MS - (now - usage.windowStart)) / 1000);
    return { allowed: false, remaining: 0, waitTime };
  }
  
  return { allowed: true, remaining };
};

// ==================== IMAGE EDIT SESSION ====================

export const getImageEditSession = (): ImageEditSession | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.IMAGE_EDIT_SESSION);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      editHistory: parsed.editHistory.map((h: any) => ({
        ...h,
        timestamp: new Date(h.timestamp),
      })),
    };
  } catch {
    return null;
  }
};

export const saveImageEditSession = (session: ImageEditSession): void => {
  localStorage.setItem(STORAGE_KEYS.IMAGE_EDIT_SESSION, JSON.stringify(session));
};

export const updateImageEditSession = (imageUrl: string, prompt: string, resultUrl: string): void => {
  const current = getImageEditSession();
  const newEntry = { prompt, resultUrl, timestamp: new Date() };
  
  if (current && current.lastImageUrl === imageUrl) {
    // Same image, add to history
    saveImageEditSession({
      lastImageUrl: imageUrl,
      editHistory: [...current.editHistory.slice(-9), newEntry],
    });
  } else {
    // New image, reset history
    saveImageEditSession({
      lastImageUrl: imageUrl,
      editHistory: [newEntry],
    });
  }
};

// ==================== EXPORT/IMPORT ====================

export const exportChatHistory = (): string => {
  const data = {
    chatHistory: getChatHistory(),
    preferences: getPreferences(),
    memory: getAIMemory(),
    reactions: getMessageReactions(),
    subscription: getSubscription(),
    chatManagement: getChatManagement(),
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

    if (parsed.chatManagement) {
      localStorage.setItem(STORAGE_KEYS.CHAT_MANAGEMENT, JSON.stringify(parsed.chatManagement));
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
