import { cn } from "@/lib/utils";

/**
 * PostCardSkeleton 컴포넌트
 * PostCard와 동일한 레이아웃의 로딩 스켈레톤 UI
 * Shimmer 효과 포함
 */
export default function PostCardSkeleton() {
  return (
    <article className="bg-white border border-[#dbdbdb] rounded-none mb-4">
      {/* 헤더 섹션 (60px) */}
      <header className="flex items-center justify-between px-4 h-[60px]">
        <div className="flex items-center gap-3">
          {/* 프로필 이미지 스켈레톤 */}
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />

          {/* 사용자명 및 시간 스켈레톤 */}
          <div className="flex flex-col gap-2">
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-2 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        {/* 메뉴 버튼 스켈레톤 */}
        <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
      </header>

      {/* 이미지 영역 (1:1 정사각형) */}
      <div className="relative aspect-square bg-gray-200 overflow-hidden">
        {/* Shimmer 효과 */}
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      </div>

      {/* 액션 버튼 영역 (48px) */}
      <div className="flex items-center justify-between px-4 py-2 h-12">
        <div className="flex items-center gap-4">
          {/* 좋아요 버튼 스켈레톤 */}
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
          {/* 댓글 버튼 스켈레톤 */}
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
          {/* 공유 버튼 스켈레톤 */}
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* 북마크 버튼 스켈레톤 */}
        <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* 컨텐츠 섹션 */}
      <div className="px-4 pb-4 space-y-2">
        {/* 좋아요 수 스켈레톤 */}
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />

        {/* 캡션 스켈레톤 */}
        <div className="space-y-1.5">
          <div className="h-3.5 w-full bg-gray-200 rounded animate-pulse" />
          <div className="h-3.5 w-3/4 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* 댓글 미리보기 스켈레톤 */}
        <div className="space-y-2 pt-1">
          <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-3.5 w-full bg-gray-200 rounded animate-pulse" />
          <div className="h-3.5 w-5/6 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </article>
  );
}

