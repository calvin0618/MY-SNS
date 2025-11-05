"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { Home, Search, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import LoginRequiredModal from "@/components/auth/LoginRequiredModal";
import { useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";

/**
 * Sidebar 컴포넌트
 * Instagram 스타일의 사이드바 네비게이션
 * 
 * Desktop (≥1024px): 244px 너비, 아이콘 + 텍스트
 * Tablet (768px~1023px): 72px 너비, 아이콘만
 * Mobile (<768px): 숨김
 */
export default function Sidebar({
  onCreatePostClick,
}: {
  onCreatePostClick: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { t } = useLanguage();

  // 만들기 버튼 클릭 처리
  const handleCreatePostClick = () => {
    if (!isAuthLoaded || !isUserLoaded) {
      return;
    }

    if (!isSignedIn || !user) {
      setIsLoginModalOpen(true);
      return;
    }

    onCreatePostClick();
  };

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

  // 메뉴 항목 정의
  const menuItems: Array<{
    icon: typeof Home;
    label: string;
    href: string;
    active: boolean;
    isAction?: boolean;
  }> = [
    {
      icon: Home,
      label: t("home"),
      href: "/",
      active: pathname === "/",
    },
    {
      icon: Search,
      label: t("search"),
      href: "/search",
      active: pathname === "/search",
    },
    {
      icon: Plus,
      label: t("create"),
      href: "#", // 모달 열기로 처리
      active: false,
      isAction: true, // 액션 버튼 (링크가 아닌 클릭 이벤트)
    },
    {
      icon: User,
      label: t("profile"),
      href: user ? `/profile/${user.id}` : "/profile",
      active: pathname?.startsWith("/profile"),
    },
  ];

  return (
    <aside
      className={cn(
        // 기본 스타일 (모바일에서는 숨김)
        "hidden md:flex flex-col",
        // 배경 및 테두리
        "bg-white dark:bg-[#1a1a1a] border-r border-[#dbdbdb] dark:border-[#333333]",
        // 고정 위치
        "fixed left-0 top-0 h-screen z-50",
        // Desktop: 244px, Tablet: 72px
        "w-[72px] lg:w-[244px]",
        // 트랜지션
        "transition-all duration-300"
      )}
    >
      {/* 로고 영역 (Desktop만 표시) */}
      <div className="hidden lg:flex items-center px-6 h-16 border-b border-[#dbdbdb] dark:border-[#333333]">
        <Link href="/" className="text-2xl font-bold text-[#262626] dark:text-[#fafafa]">
          My SNS
        </Link>
      </div>

      {/* 메뉴 항목 */}
      <nav className="flex-1 px-3 py-4 lg:px-6">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.active;

            return (
              <li key={item.href}>
                {item.isAction ? (
                  <button
                    onClick={handleCreatePostClick}
                    className={cn(
                      // 기본 스타일
                      "flex items-center gap-4 px-3 py-3 lg:px-4 rounded-lg w-full",
                      "text-[#262626] dark:text-[#fafafa] transition-colors",
                      // Hover 효과
                      "hover:bg-gray-50 dark:hover:bg-[#2a2a2a]",
                      // Tablet에서는 아이콘만 중앙 정렬
                      "justify-center lg:justify-start"
                    )}
                  >
                    <Icon className="w-6 h-6 flex-shrink-0" />
                    {/* Desktop에서만 텍스트 표시 */}
                    <span className="hidden lg:inline text-sm">
                      {item.label}
                    </span>
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={item.label === "프로필" ? handleProfileClick : undefined}
                    className={cn(
                      // 기본 스타일
                      "flex items-center gap-4 px-3 py-3 lg:px-4 rounded-lg",
                      "text-[#262626] dark:text-[#fafafa] transition-colors",
                      // Hover 효과
                      "hover:bg-gray-50 dark:hover:bg-[#2a2a2a]",
                      // Active 상태
                      isActive && "font-semibold",
                      // Tablet에서는 아이콘만 중앙 정렬
                      "justify-center lg:justify-start"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-6 h-6 flex-shrink-0",
                        isActive && "stroke-[2.5px]" // Active 시 더 두껍게
                      )}
                    />
                    {/* Desktop에서만 텍스트 표시 */}
                    <span className="hidden lg:inline text-sm">
                      {item.label}
                    </span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 로그인 요청 모달 */}
      <LoginRequiredModal
        open={isLoginModalOpen}
        onOpenChange={setIsLoginModalOpen}
      />
    </aside>
  );
}

