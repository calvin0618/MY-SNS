"use client";

import { SignedOut, SignInButton, SignUpButton, SignedIn, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSelector } from "@/components/ui/language-selector";
import { useLanguage } from "@/components/providers/language-provider";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";

const Navbar = () => {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { t } = useLanguage();
  const supabase = useClerkSupabaseClient();
  const [supabaseUsername, setSupabaseUsername] = useState<string | null>(null);
  
  // Supabase에서 사용자명 가져오기
  useEffect(() => {
    const fetchUsername = async () => {
      if (!clerkUser?.id || !isUserLoaded) {
        setSupabaseUsername(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("users")
          .select("username")
          .eq("clerk_id", clerkUser.id)
          .single();

        if (!error && data) {
          setSupabaseUsername(data.username);
        } else {
          // Supabase에서 가져오지 못한 경우 Clerk username 사용
          setSupabaseUsername(clerkUser.username || null);
        }
      } catch (error) {
        console.error("❌ 사용자명 조회 실패:", error);
        // 에러 발생 시 Clerk username 사용
        setSupabaseUsername(clerkUser.username || null);
      }
    };

    fetchUsername();
  }, [clerkUser?.id, isUserLoaded, supabase]);
  
  // 표시할 사용자명 결정 (Supabase username 우선, 없으면 Clerk username)
  const displayName = supabaseUsername || 
                      clerkUser?.username || 
                      "My SNS";

  return (
    <header className="flex justify-between items-center p-2 sm:p-4 gap-2 sm:gap-4 h-16 max-w-7xl mx-auto overflow-hidden md:ml-[72px] lg:ml-[244px] md:pl-4 lg:pl-6">
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
        <Link 
          href="/" 
          className="text-[#262626] dark:text-[#fafafa] hover:opacity-70 transition-opacity flex-shrink-0"
          aria-label="홈으로 가기"
        >
          <Home className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
        </Link>
        <Link href="/" className="text-lg sm:text-2xl font-bold flex-shrink-0 min-w-0 truncate text-[#262626] dark:text-[#fafafa]">
          {displayName}
        </Link>
      </div>
      <div className="flex gap-1 sm:gap-2 md:gap-4 items-center flex-shrink-0 min-w-fit">
        <div className="flex-shrink-0 min-w-[32px] flex items-center justify-center">
          <ThemeToggle className="text-[#262626] dark:text-[#fafafa]" />
        </div>
        <div className="flex-shrink-0 min-w-[32px] flex items-center justify-center">
          <LanguageSelector className="text-[#262626] dark:text-[#fafafa]" />
        </div>
        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="outline" className="flex-shrink-0 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 whitespace-nowrap">
              {t("login")}
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button className="flex-shrink-0 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 whitespace-nowrap bg-[#0095f6] hover:bg-[#1877f2] text-white">
              {t("signUp")}
            </Button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <div className="flex-shrink-0 min-w-[32px] flex items-center justify-center">
            <UserButton />
          </div>
        </SignedIn>
      </div>
    </header>
  );
};

export default Navbar;
