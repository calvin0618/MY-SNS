"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Home, Search, Plus, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom Navigation 컴포넌트
 * Instagram 스타일의 모바일 하단 네비게이션
 * 
 * Mobile (<768px): 높이 50px, 5개 아이콘 (홈, 검색, 만들기, 좋아요, 프로필)
 * Desktop/Tablet: 숨김
 */
export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();

  // 메뉴 항목 정의
  const menuItems = [
    {
      icon: Home,
      label: "홈",
      href: "/",
      active: pathname === "/",
    },
    {
      icon: Search,
      label: "검색",
      href: "/explore", // 1차 MVP 제외 기능이지만 UI는 준비
      active: pathname === "/explore",
    },
    {
      icon: Plus,
      label: "만들기",
      href: "/create", // 게시물 작성 모달 열기 (추후 구현)
      active: pathname === "/create",
    },
    {
      icon: Heart,
      label: "좋아요",
      href: "/activity", // 1차 MVP 제외 기능이지만 UI는 준비
      active: pathname === "/activity",
    },
    {
      icon: User,
      label: "프로필",
      href: user ? `/profile/${user.id}` : "/profile",
      active: pathname?.startsWith("/profile"),
    },
  ];

  return (
    <nav
      className={cn(
        // 모바일에서만 표시
        "md:hidden",
        // 고정 위치 (하단)
        "fixed bottom-0 left-0 right-0 z-50",
        // 높이 50px
        "h-[50px]",
        // 배경 및 테두리
        "bg-white border-t border-[#dbdbdb]",
        // 레이아웃
        "flex items-center justify-around"
      )}
    >
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.active;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              // 기본 스타일
              "flex flex-col items-center justify-center",
              "flex-1 h-full",
              "text-[#262626] transition-colors",
              // Hover 효과
              "hover:opacity-70",
              // Active 상태
              isActive && "opacity-100"
            )}
            aria-label={item.label}
          >
            <Icon
              className={cn(
                "w-6 h-6",
                isActive && "stroke-[2.5px]" // Active 시 더 두껍게
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}

