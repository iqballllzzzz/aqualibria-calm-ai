// Activity logging helper - logs user actions to backend
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const logActivity = async (
  firebaseUid: string,
  action: string,
  details?: Record<string, unknown>,
  userEmail?: string,
  userDisplayName?: string
) => {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/log-activity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
      },
      body: JSON.stringify({
        firebase_uid: firebaseUid,
        user_email: userEmail || null,
        user_display_name: userDisplayName || null,
        action,
        details: details || {},
      }),
    });
  } catch (err) {
    // Silent fail - logging should never break the app
    console.debug("Activity log failed:", err);
  }
};
