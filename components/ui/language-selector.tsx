"use client";

import * as React from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/components/providers/language-provider";
import { languages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Language Selector 컴포넌트
 * 언어 선택 드롭다운 메뉴
 */
export function LanguageSelector({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  const [mounted, setMounted] = React.useState(false);

  // Hydration 에러 방지
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("flex-shrink-0", className)}
        aria-label="언어 선택"
      >
        <Languages className="w-5 h-5 text-current" />
      </Button>
    );
  }

  const currentLanguage = languages.find((lang) => lang.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("flex-shrink-0 relative", className)}
          aria-label={`현재 언어: ${currentLanguage?.nativeName || "한국어"}`}
        >
          <Languages className="w-5 h-5 text-current" />
          <span className="sr-only">언어 선택</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={cn(
              "cursor-pointer",
              language === lang.code && "bg-accent font-semibold"
            )}
          >
            <div className="flex items-center justify-between w-full">
              <span>{lang.nativeName}</span>
              {language === lang.code && (
                <span className="text-primary ml-2">✓</span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

