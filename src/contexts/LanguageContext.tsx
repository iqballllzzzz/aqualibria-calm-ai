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
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "th", name: "Thai", nativeName: "ไทย" },
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
    "chat.empty.title": "How can I help you today?",
    "chat.empty.subtitle": "Start a conversation or use the + menu for more options",
    "menu.history": "Chat History",
    "menu.search": "Search Chats",
    "menu.coding": "Coding Partner",
    "menu.language": "Language",
    "menu.theme": "Theme",
    "menu.settings": "Settings",
    "menu.newChat": "New Chat",
    "menu.logout": "Sign Out",
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
    "settings.title": "Settings",
    "settings.ai": "AI Settings",
    "settings.aiName": "AI Name",
    "settings.personality": "Personality",
    "settings.chat": "Chat Management",
    "settings.export": "Export Chat History",
    "settings.import": "Import Chat History",
    "settings.appearance": "Appearance",
    "settings.memory": "AI Memory",
    "settings.memoryDesc": "AquaLibriaAI can remember your name, preferences, and habits to provide a more personalized experience.",
    "settings.rememberName": "Remember my name",
    "settings.rememberPrefs": "Remember preferences",
    "settings.rememberStyle": "Remember writing style",
    "settings.privacy": "Privacy",
    "settings.privacyPolicy": "Privacy Policy",
    "plus.uploadImage": "Upload Image",
    "plus.uploadVideo": "Upload Video",
    "plus.uploadFile": "Upload File",
    "plus.chooseModel": "Choose Model",
    "plus.generateImage": "Generate Image",
    "plus.deepResearch": "Deep Research",
    "plus.spotifySearch": "Spotify Search",
    "plus.quoteMaker": "Quote Maker",
    "mode.research": "Deep Research Mode",
    "mode.image": "Image Generation Mode",
    "mode.spotify": "Spotify Search Mode",
    "mode.quote": "Quote Maker Mode",
    "mode.cancel": "Cancel",
    "loading.thinking": "Thinking...",
    "loading.research": "Researching...",
    "loading.image": "Generating image...",
    "loading.quote": "Creating quote...",
    "error.api": "Failed to get response",
    "error.generic": "Something went wrong. Please try again.",
    "quote.prompt": "Enter your quote text",
    "quote.author": "Author (optional)",
    "quote.style": "Style",
    "quote.create": "Create Quote",
    "history.empty": "No chat history yet",
    "history.delete": "Delete",
    "history.deleteAll": "Delete All",
    "search.placeholder": "Search chats...",
    "search.noResults": "No results found",
  },
  es: {
    "welcome.greeting": "Hola, soy AquaLibriaAI",
    "welcome.subtitle": "Tu compañero tranquilo e inteligente para pensar, programar, aprender y crear.",
    "welcome.continue": "Continuar",
    "intent.question": "¿Para qué te gustaría usarme hoy?",
    "intent.coding": "Programación",
    "intent.learning": "Aprendizaje",
    "intent.images": "Generación de Imágenes",
    "intent.quotes": "Creación de Citas",
    "chat.placeholder": "Mensaje a AquaLibriaAI...",
    "chat.send": "Enviar",
    "menu.history": "Historial de Chat",
    "menu.search": "Buscar Chats",
    "menu.language": "Idioma",
    "menu.theme": "Tema",
    "menu.settings": "Configuración",
    "login.title": "Bienvenido de nuevo",
    "login.subtitle": "Inicia sesión para continuar tu viaje",
    "login.signin": "Iniciar Sesión",
    "login.google": "Continuar con Google",
  },
  fr: {
    "welcome.greeting": "Bonjour, je suis AquaLibriaAI",
    "welcome.subtitle": "Votre compagnon calme et intelligent pour réfléchir, coder, apprendre et créer.",
    "welcome.continue": "Continuer",
    "intent.question": "Pour quoi aimeriez-vous m'utiliser aujourd'hui?",
    "intent.coding": "Programmation",
    "intent.learning": "Apprentissage",
    "intent.images": "Génération d'Images",
    "intent.quotes": "Création de Citations",
    "chat.placeholder": "Message à AquaLibriaAI...",
    "login.title": "Bienvenue",
    "login.subtitle": "Connectez-vous pour continuer",
  },
  de: {
    "welcome.greeting": "Hallo, ich bin AquaLibriaAI",
    "welcome.subtitle": "Ihr ruhiger, intelligenter Begleiter zum Denken, Programmieren, Lernen und Erstellen.",
    "welcome.continue": "Fortfahren",
    "chat.placeholder": "Nachricht an AquaLibriaAI...",
  },
  zh: {
    "welcome.greeting": "你好，我是AquaLibriaAI",
    "welcome.subtitle": "您平静而智能的思考、编程、学习和创作伙伴。",
    "welcome.continue": "继续",
    "chat.placeholder": "给AquaLibriaAI发消息...",
  },
  ja: {
    "welcome.greeting": "こんにちは、AquaLibriaAIです",
    "welcome.subtitle": "思考、コーディング、学習、創造のための穏やかで知的なコンパニオン。",
    "welcome.continue": "続ける",
    "chat.placeholder": "AquaLibriaAIにメッセージ...",
  },
  ko: {
    "welcome.greeting": "안녕하세요, AquaLibriaAI입니다",
    "welcome.subtitle": "생각, 코딩, 학습, 창작을 위한 차분하고 지능적인 동반자입니다.",
    "welcome.continue": "계속",
    "chat.placeholder": "AquaLibriaAI에게 메시지...",
  },
  ru: {
    "welcome.greeting": "Привет, я AquaLibriaAI",
    "welcome.subtitle": "Ваш спокойный и умный компаньон для размышлений, программирования, обучения и творчества.",
    "welcome.continue": "Продолжить",
    "chat.placeholder": "Сообщение для AquaLibriaAI...",
  },
  ar: {
    "welcome.greeting": "مرحباً، أنا AquaLibriaAI",
    "welcome.subtitle": "رفيقك الهادئ والذكي للتفكير والبرمجة والتعلم والإبداع.",
    "welcome.continue": "متابعة",
    "chat.placeholder": "رسالة إلى AquaLibriaAI...",
  },
  pt: {
    "welcome.greeting": "Olá, sou AquaLibriaAI",
    "welcome.subtitle": "Seu companheiro calmo e inteligente para pensar, programar, aprender e criar.",
    "welcome.continue": "Continuar",
    "chat.placeholder": "Mensagem para AquaLibriaAI...",
  },
  hi: {
    "welcome.greeting": "नमस्ते, मैं AquaLibriaAI हूं",
    "welcome.subtitle": "सोचने, कोडिंग, सीखने और बनाने के लिए आपका शांत, बुद्धिमान साथी।",
    "welcome.continue": "जारी रखें",
    "chat.placeholder": "AquaLibriaAI को संदेश...",
  },
  id: {
    "welcome.greeting": "Halo, saya AquaLibriaAI",
    "welcome.subtitle": "Teman tenang dan cerdas Anda untuk berpikir, coding, belajar, dan berkreasi.",
    "welcome.continue": "Lanjutkan",
    "chat.placeholder": "Pesan ke AquaLibriaAI...",
  },
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
