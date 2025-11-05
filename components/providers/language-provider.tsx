"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Language, defaultLanguage, getTranslation, TranslationKey } from "@/lib/i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);
  const [mounted, setMounted] = useState(false);

  // 클라이언트 측에서만 실행
  useEffect(() => {
    setMounted(true);
    // localStorage에서 언어 설정 불러오기
    const savedLanguage = localStorage.getItem("language") as Language | null;
    if (savedLanguage && ["ko", "en", "ja", "zh"].includes(savedLanguage)) {
      setLanguageState(savedLanguage);
    } else {
      // 브라우저 언어 감지
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith("ja")) {
        setLanguageState("ja");
      } else if (browserLang.startsWith("zh")) {
        setLanguageState("zh");
      } else if (browserLang.startsWith("en")) {
        setLanguageState("en");
      } else {
        setLanguageState("ko");
      }
    }
  }, []);

  // 클라이언트 측에서 HTML lang 속성 설정
  useEffect(() => {
    if (mounted && typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language, mounted]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof document !== "undefined") {
      localStorage.setItem("language", lang);
      document.documentElement.lang = lang;
    }
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>) => {
    return getTranslation(language, key, params);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

