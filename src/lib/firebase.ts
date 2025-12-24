import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";

// Firebase configuration - Replace with your own config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abc123",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Auth functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    if (!result.user.emailVerified) {
      return { user: null, error: "Please verify your email before logging in. Check your inbox or spam folder." };
    }
    return { user: result.user, error: null };
  } catch (error: any) {
    let errorMessage = "Failed to sign in";
    if (error.code === "auth/user-not-found") {
      errorMessage = "No account found with this email";
    } else if (error.code === "auth/wrong-password") {
      errorMessage = "Incorrect password";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email address";
    } else if (error.code === "auth/too-many-requests") {
      errorMessage = "Too many attempts. Please try again later.";
    }
    return { user: null, error: errorMessage };
  }
};

export const registerWithEmail = async (email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(result.user);
    return { 
      user: result.user, 
      error: null,
      message: "Verification email sent. Please check your inbox (and spam folder)."
    };
  } catch (error: any) {
    let errorMessage = "Failed to create account";
    if (error.code === "auth/email-already-in-use") {
      errorMessage = "An account with this email already exists";
    } else if (error.code === "auth/weak-password") {
      errorMessage = "Password should be at least 6 characters";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email address";
    }
    return { user: null, error: errorMessage, message: null };
  }
};

export const resendVerificationEmail = async () => {
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    try {
      await sendEmailVerification(user);
      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: "No user to verify" };
};

export const logOut = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export type { User };
