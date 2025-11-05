"use client";

import Link from "next/link";
import { useUser, useAuth } from "@clerk/nextjs";
import { Home, Heart, Send, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import LoginRequiredModal from "@/components/auth/LoginRequiredModal";
import { useState } from "react";

/**
 * Mobile Header 컴포넌트
 * Instagram 스타일의 모바일 헤더
 * 
 * Mobile (<768px): 높이 60px, 로고 + 알림/DM/프로필 아이콘
 * Desktop/Tablet: 숨김
 */
export default function Header() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // 프로필 클릭 처리
  const handleProfileClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isAuthLoaded || !isUserLoaded) {
      return;
    }

    if (!isSignedIn || !user) {
      e.preventDefault();
      setIsLoginModalOpen(true);
      return;
    }
  };

  return (
    <header
      className={cn(
        // 모바일에서만 표시
        "md:hidden",
        // 고정 위치
        "fixed top-0 left-0 right-0 z-50",
        // 높이 60px
        "h-[60px]",
        // 배경 및 테두리
        "bg-white dark:bg-[#1a1a1a] border-b border-[#dbdbdb] dark:border-[#333333]",
        // 레이아웃
        "flex items-center justify-between px-2 sm:px-4",
        // 오버플로우 방지
        "overflow-hidden"
      )}
    >
      {/* 좌측: 홈 버튼 + 로고 */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
        <Link 
          href="/" 
          className="text-[#262626] dark:text-[#fafafa] hover:opacity-70 transition-opacity flex-shrink-0"
          aria-label="홈으로 가기"
        >
          <Home className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
        </Link>
        <Link 
          href="/" 
          className="text-base sm:text-xl font-bold text-[#262626] dark:text-[#fafafa] flex-shrink-0 min-w-0 truncate"
        >
          My SNS
        </Link>
      </div>

      {/* 우측 아이콘 그룹 - 항상 보이도록 설정 */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 min-w-fit z-10 relative">
        {/* 알림 아이콘 (1차 MVP 제외 기능이지만 UI는 준비) */}
        <Link
          href="/notifications"
          className="text-[#262626] dark:text-[#fafafa] hover:opacity-70 transition-opacity flex-shrink-0 min-w-[24px] flex items-center justify-center"
          aria-label="알림"
        >
          <Heart className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" strokeWidth={2} />
        </Link>

        {/* DM 아이콘 (1차 MVP 제외 기능이지만 UI는 준비) */}
        <Link
          href="/messages"
          onClick={(e) => {
            if (!isAuthLoaded || !isUserLoaded) {
              return;
            }

            if (!isSignedIn || !user) {
              e.preventDefault();
              setIsLoginModalOpen(true);
            }
          }}
          className="text-[#262626] dark:text-[#fafafa] hover:opacity-70 transition-opacity flex-shrink-0 min-w-[24px] flex items-center justify-center"
          aria-label="메시지"
        >
          <Send className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" strokeWidth={2} />
        </Link>

        {/* 다크모드 토글 버튼 */}
        <div className="flex-shrink-0 min-w-[32px] flex items-center justify-center">
          <ThemeToggle className="text-[#262626] dark:text-[#fafafa]" />
        </div>

        {/* 프로필 아이콘 */}
        <Link
          href={user ? `/profile/${user.id}` : "/profile"}
          onClick={handleProfileClick}
          className="text-[#262626] dark:text-[#fafafa] hover:opacity-70 transition-opacity flex-shrink-0 min-w-[24px] flex items-center justify-center"
          aria-label="프로필"
        >
          <User className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" strokeWidth={2} />
        </Link>
      </div>

      {/* 로그인 요청 모달 */}
      <LoginRequiredModal
        open={isLoginModalOpen}
        onOpenChange={setIsLoginModalOpen}
      />
    </header>
  );
}

