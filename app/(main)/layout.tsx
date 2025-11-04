import MainLayoutClient from "@/components/layout/MainLayoutClient";

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
  return <MainLayoutClient>{children}</MainLayoutClient>;
}

