"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Heart, Send, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobile Header 컴포넌트
 * Instagram 스타일의 모바일 헤더
 * 
 * Mobile (<768px): 높이 60px, 로고 + 알림/DM/프로필 아이콘
 * Desktop/Tablet: 숨김
 */
export default function Header() {
  const { user } = useUser();

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
        "bg-white border-b border-[#dbdbdb]",
        // 레이아웃
        "flex items-center justify-between px-4"
      )}
    >
      {/* 로고 */}
      <Link href="/" className="text-xl font-bold text-[#262626]">
        Instagram
      </Link>

      {/* 우측 아이콘 그룹 */}
      <div className="flex items-center gap-4">
        {/* 알림 아이콘 (1차 MVP 제외 기능이지만 UI는 준비) */}
        <Link
          href="/notifications"
          className="text-[#262626] hover:opacity-70 transition-opacity"
          aria-label="알림"
        >
          <Heart className="w-6 h-6" strokeWidth={2} />
        </Link>

        {/* DM 아이콘 (1차 MVP 제외 기능이지만 UI는 준비) */}
        <Link
          href="/messages"
          className="text-[#262626] hover:opacity-70 transition-opacity"
          aria-label="메시지"
        >
          <Send className="w-6 h-6" strokeWidth={2} />
        </Link>

        {/* 프로필 아이콘 */}
        <Link
          href={user ? `/profile/${user.id}` : "/profile"}
          className="text-[#262626] hover:opacity-70 transition-opacity"
          aria-label="프로필"
        >
          <User className="w-6 h-6" strokeWidth={2} />
        </Link>
      </div>
    </header>
  );
}

