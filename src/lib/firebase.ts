// Auth module - Using Supabase Auth (migrated from Firebase)
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// Compatibility layer - map Supabase User to a Firebase-like interface
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  providerData: { providerId: string }[];
}

const mapUser = (supaUser: SupabaseUser | null): User | null => {
  if (!supaUser) return null;
  return {
    uid: supaUser.id,
    email: supaUser.email || null,
    displayName: supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || supaUser.email?.split("@")[0] || null,
    photoURL: supaUser.user_metadata?.avatar_url || supaUser.user_metadata?.picture || null,
    emailVerified: !!supaUser.email_confirmed_at,
    providerData: supaUser.app_metadata?.providers?.map((p: string) => ({ providerId: p })) || [{ providerId: "email" }],
  };
};

// Sign in with email
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      let msg = "Failed to sign in";
      if (error.message.includes("Invalid login")) msg = "Email or password incorrect";
      else if (error.message.includes("Email not confirmed")) msg = "Please verify your email first";
      else msg = error.message;
      return { user: null, error: msg };
    }
    return { user: mapUser(data.user), error: null };
  } catch (error: any) {
    return { user: null, error: error.message || "Failed to sign in" };
  }
};

// Register with email
export const registerWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      let msg = "Failed to create account";
      if (error.message.includes("already registered")) msg = "An account with this email already exists";
      else msg = error.message;
      return { user: null, error: msg, message: null };
    }
    return {
      user: mapUser(data.user),
      error: null,
      message: "Account created! Please verify with the code sent to your email.",
    };
  } catch (error: any) {
    return { user: null, error: error.message || "Failed to create account", message: null };
  }
};

// Sign in with phone (OTP)
export const signInWithPhone = async (phone: string) => {
  try {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to send OTP" };
  }
};

// Verify phone OTP
export const verifyPhoneOtp = async (phone: string, token: string) => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    if (error) return { user: null, error: error.message };
    return { user: mapUser(data.user), error: null };
  } catch (error: any) {
    return { user: null, error: error.message || "OTP verification failed" };
  }
};

// Resend verification
export const resendVerificationEmail = async () => {
  return { success: false, error: "Use OTP verification instead" };
};

// Logout
export const logOut = async () => {
  try {
    await supabase.auth.signOut();
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Auth state change listener
export const onAuthChange = (callback: (user: User | null) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    callback(mapUser(session?.user || null));
  });
  // Also check current session immediately
  supabase.auth.getSession().then(({ data: { session } }) => {
    callback(mapUser(session?.user || null));
  });
  return () => subscription.unsubscribe();
};

export { supabase };
