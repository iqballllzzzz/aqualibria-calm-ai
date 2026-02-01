/* Storage & quota helpers
   - timezone-aware daily counters (Asia/Jakarta)
   - LatentLeaf free: 15/day
   - Chat free: 80/day
   - Model v2: 50/day
   - Model v3: 45/day
   - Image edit session persistence
*/

const ASIA_TIMEZONE = "Asia/Jakarta";
const getLocalDateKey = (timeZone = ASIA_TIMEZONE): string => {
  const now = new Date();
  // en-CA yields YYYY-MM-DD
  return now.toLocaleString("en-CA", { timeZone }).split(",")[0];
};

const STORAGE_KEYS = {
  LATENTLEAF_DAILY: "latentleaf_daily_v1",
  CHAT_DAILY: "chat_daily_v1",
  MODEL_V2_DAILY: "model_v2_daily_v1",
  MODEL_V3_DAILY: "model_v3_daily_v1",
  IMAGE_EDIT_SESSION: "image_edit_session_v1",
};

// LatentLeaf
export const LATENTLEAF_FREE_DAILY = 15;
export const getLatentLeafUsage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LATENTLEAF_DAILY);
    if (!raw) return { date: getLocalDateKey(), count: 0 };
    const parsed = JSON.parse(raw);
    if (parsed.date !== getLocalDateKey()) return { date: getLocalDateKey(), count: 0 };
    return parsed;
  } catch { return { date: getLocalDateKey(), count: 0 }; }
};
export const incrementLatentLeafUsage = () => {
  const cur = getLatentLeafUsage();
  const next = { date: getLocalDateKey(), count: (cur.count || 0) + 1 };
  localStorage.setItem(STORAGE_KEYS.LATENTLEAF_DAILY, JSON.stringify(next));
};
export const canUseLatentLeaf = () => {
  const u = getLatentLeafUsage();
  const remaining = Math.max(0, LATENTLEAF_FREE_DAILY - (u.count || 0));
  return { allowed: remaining > 0, remaining, date: u.date };
};

// Chat free
export const CHAT_FREE_DAILY = 80;
export const getChatDailyUsage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHAT_DAILY);
    if (!raw) return { date: getLocalDateKey(), count: 0 };
    const parsed = JSON.parse(raw);
    if (parsed.date !== getLocalDateKey()) return { date: getLocalDateKey(), count: 0 };
    return parsed;
  } catch { return { date: getLocalDateKey(), count: 0 }; }
};
export const incrementChatUsage = (by = 1) => {
  const cur = getChatDailyUsage();
  const next = { date: getLocalDateKey(), count: (cur.count || 0) + by };
  localStorage.setItem(STORAGE_KEYS.CHAT_DAILY, JSON.stringify(next));
};

// Model daily limits
export const MODEL_V2_DAILY_LIMIT = 50;
export const MODEL_V3_DAILY_LIMIT = 45;

export const getModelDailyUsage = (model: "v2" | "v3") => {
  try {
    const key = model === "v2" ? STORAGE_KEYS.MODEL_V2_DAILY : STORAGE_KEYS.MODEL_V3_DAILY;
    const raw = localStorage.getItem(key);
    if (!raw) return { date: getLocalDateKey(), count: 0 };
    const parsed = JSON.parse(raw);
    if (parsed.date !== getLocalDateKey()) return { date: getLocalDateKey(), count: 0 };
    return parsed;
  } catch { return { date: getLocalDateKey(), count: 0 }; }
};
export const incrementModelUsage = (model: "v2" | "v3", by = 1) => {
  const key = model === "v2" ? STORAGE_KEYS.MODEL_V2_DAILY : STORAGE_KEYS.MODEL_V3_DAILY;
  const cur = getModelDailyUsage(model);
  const next = { date: getLocalDateKey(), count: (cur.count || 0) + by };
  localStorage.setItem(key, JSON.stringify(next));
};
export const canUseModel = (model: "v2" | "v3") => {
  const usage = getModelDailyUsage(model);
  const limit = model === "v2" ? MODEL_V2_DAILY_LIMIT : MODEL_V3_DAILY_LIMIT;
  const remaining = Math.max(0, limit - (usage.count || 0));
  return { allowed: remaining > 0, remaining, date: usage.date };
};

// Image edit session persistence
export type ImageEditEntry = { prompt: string; resultUrl: string; timestamp: string };
export type ImageEditSession = { lastImageUrl?: string; editHistory: ImageEditEntry[] } | null;

export const getImageEditSession = (): ImageEditSession => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.IMAGE_EDIT_SESSION);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
};
export const saveImageEditSession = (sess: { lastImageUrl?: string; editHistory: ImageEditEntry[] }) => {
  localStorage.setItem(STORAGE_KEYS.IMAGE_EDIT_SESSION, JSON.stringify(sess));
};
export const updateImageEditSession = (imageUrl: string, prompt: string, resultUrl: string) => {
  const cur = getImageEditSession();
  const entry: ImageEditEntry = { prompt, resultUrl, timestamp: new Date().toISOString() };
  if (cur && cur.lastImageUrl === imageUrl) {
    const list = [...(cur.editHistory || []).slice(-9), entry];
    saveImageEditSession({ lastImageUrl: imageUrl, editHistory: list });
  } else {
    saveImageEditSession({ lastImageUrl: imageUrl, editHistory: [entry] });
  }
};
