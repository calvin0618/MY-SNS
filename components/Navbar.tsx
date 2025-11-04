"use client";

import { SignedOut, SignInButton, SignedIn, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const Navbar = () => {
  const { user } = useUser();
  
  // 사용자 이름 가져오기 (username, fullName, firstName, 이메일 순서로)
  const userName = user?.username || 
                   user?.fullName || 
                   user?.firstName || 
                   user?.emailAddresses[0]?.emailAddress?.split("@")[0] || 
                   "My";
  
  const displayName = `${userName} SNS`;

  return (
    <header className="flex justify-between items-center p-2 sm:p-4 gap-2 sm:gap-4 h-16 max-w-7xl mx-auto overflow-hidden">
      <Link href="/" className="text-lg sm:text-2xl font-bold flex-shrink-0 min-w-0 truncate">
        {displayName}
      </Link>
      <div className="flex gap-1 sm:gap-2 md:gap-4 items-center flex-shrink-0 min-w-fit">
        <div className="flex-shrink-0 min-w-[32px] flex items-center justify-center">
          <ThemeToggle />
        </div>
        <SignedOut>
          <SignInButton mode="modal">
            <Button className="flex-shrink-0 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 whitespace-nowrap">
              로그인
            </Button>
          </SignInButton>
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
