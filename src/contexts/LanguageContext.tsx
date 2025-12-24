import React, { createContext, useContext, useEffect, useState } from "react";

export const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
];

interface LanguageContextType {
  language: string;
  setLanguage: (code: string) => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<string, string>> = {
  en: {
    "welcome.greeting": "Hello, I'm AquaLibriaAI",
    "welcome.subtitle": "Your calm, intelligent companion for thinking, coding, learning, and creating.",
    "welcome.continue": "Continue",
    "intent.question": "What would you like to use me for today?",
    "intent.coding": "Coding",
    "intent.learning": "Learning",
    "intent.images": "Image Generation",
    "intent.quotes": "Quote Creation",
    "chat.placeholder": "Message AquaLibriaAI...",
    "chat.send": "Send",
    "menu.history": "Chat History",
    "menu.search": "Search Chats",
    "menu.coding": "Coding Partner",
    "menu.language": "Language",
    "menu.theme": "Theme",
    "menu.settings": "Settings",
    "login.title": "Welcome back",
    "login.subtitle": "Sign in to continue your journey",
    "login.email": "Email",
    "login.password": "Password",
    "login.signin": "Sign In",
    "login.google": "Continue with Google",
    "login.noAccount": "Don't have an account?",
    "login.register": "Create one",
    "register.title": "Create your account",
    "register.subtitle": "Begin your journey with AquaLibriaAI",
    "register.email": "Email",
    "register.password": "Password",
    "register.confirm": "Confirm Password",
    "register.create": "Create Account",
    "register.google": "Continue with Google",
    "register.hasAccount": "Already have an account?",
    "register.login": "Sign in",
    "register.verify": "Check your email",
    "register.verifyMessage": "We've sent a verification link to your email. Please check your inbox (and spam folder) to verify your account.",
  },
  // Add more translations as needed
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    const stored = localStorage.getItem("aqua-language");
    if (stored) return stored;
    
    const browserLang = navigator.language.split("-")[0];
    const supported = languages.find((l) => l.code === browserLang);
    return supported ? browserLang : "en";
  });

  useEffect(() => {
    localStorage.setItem("aqua-language", language);
  }, [language]);

  const setLanguage = (code: string) => {
    setLanguageState(code);
  };

  const t = (key: string): string => {
    const langTranslations = translations[language] || translations.en;
    return langTranslations[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
