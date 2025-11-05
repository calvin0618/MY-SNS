"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import CreatePostModal from "@/components/post/CreatePostModal";
import { usePostRefresh } from "@/components/providers/post-refresh-provider";
import { cn } from "@/lib/utils";

/**
 * MainLayoutClient 컴포넌트
 * 클라이언트 사이드 로직 (모달 상태 관리 등)
 */
export default function MainLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const { refreshPosts } = usePostRefresh();

  // 게시물 작성 완료 후 콜백
  const handlePostCreated = () => {
    console.log("✅ 게시물 작성 완료 - 피드 새로고침");
    // Context를 통해 피드 새로고침
    refreshPosts();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar 컴포넌트 (Desktop/Tablet) */}
      <Sidebar onCreatePostClick={() => setIsCreatePostModalOpen(true)} />

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
      <BottomNav onCreatePostClick={() => setIsCreatePostModalOpen(true)} />

      {/* 게시물 작성 모달 */}
      <CreatePostModal
        open={isCreatePostModalOpen}
        onOpenChange={setIsCreatePostModalOpen}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
}

