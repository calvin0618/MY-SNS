"use client";

import { SignedOut, SignInButton, SignUpButton, SignedIn, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import React from "react";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSelector } from "@/components/ui/language-selector";
import { useLanguage } from "@/components/providers/language-provider";

const Navbar = () => {
  const { user } = useUser();
  const { t } = useLanguage();
  
  // 사용자 이름 가져오기 (username, fullName, firstName, 이메일 순서로)
  const userName = user?.username || 
                   user?.fullName || 
                   user?.firstName || 
                   user?.emailAddresses[0]?.emailAddress?.split("@")[0] || 
                   "My";
  
  const displayName = `${userName} SNS`;

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
