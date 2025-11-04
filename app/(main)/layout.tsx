import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { cn } from "@/lib/utils";

/**
 * (main) Route Group 레이아웃
 * Sidebar와 Header가 포함된 메인 레이아웃
 * 
 * 이 레이아웃은 다음 경로에 적용됩니다:
 * - / (홈)
 * - /profile
 * - /profile/[userId]
 * - /post/[postId]
 * 등 Sidebar가 필요한 모든 페이지
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Sidebar 컴포넌트 (Desktop/Tablet) */}
      <Sidebar />

      {/* Mobile Header 컴포넌트 (Mobile만 표시) */}
      <Header />

      {/* 메인 콘텐츠 영역 */}
      <main
        className={cn(
          // Sidebar 공간 확보 (Desktop/Tablet)
          "md:ml-[72px] lg:ml-[244px]",
          // Mobile Header 공간 확보 (Mobile)
          "pt-[60px] md:pt-0",
          // Mobile Bottom Nav 공간 확보 (Mobile)
          "pb-[50px] md:pb-8",
          // 최대 너비 및 중앙 정렬
          "max-w-[630px] mx-auto",
          // 패딩
          "px-4 py-8"
        )}
      >
        {children}
      </main>

      {/* Bottom Navigation 컴포넌트 (Mobile만 표시) */}
      <BottomNav />
    </div>
  );
}

