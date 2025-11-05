"use client";

import { useRouter } from "next/navigation";
import { PostWithUser } from "@/lib/types";
import PostCard from "./PostCard";
import PostCardSkeleton from "./PostCardSkeleton";

interface PostFeedProps {
  posts?: PostWithUser[];
  loading?: boolean;
  onPostDeleted?: () => void;
  onPostCreated?: () => void;
}

/**
 * PostFeed 컴포넌트
 * 게시물 목록을 렌더링하는 피드 컴포넌트
 * 
 * 로딩 상태 처리 포함
 * 무한 스크롤과 페이지네이션은 추후 구현 예정
 */
export default function PostFeed({ posts = [], loading = false, onPostDeleted, onPostCreated }: PostFeedProps) {
  const router = useRouter();
  
  // PostFeed는 onPostCreated를 직접 사용하지 않지만, 
  // MainLayoutClient에서 접근할 수 있도록 전달받습니다.

  // 게시물 삭제 후 피드 새로고침
  const handlePostDeleted = () => {
    console.log("✅ 게시물 삭제 완료 - 피드 새로고침");
    router.refresh();
    
    // 부모 컴포넌트에 알림
    if (onPostDeleted) {
      onPostDeleted();
    }
  };

  // 초기 로딩 상태
  if (loading) {
    return (
      <div className="w-full">
        {Array.from({ length: 5 }).map((_, index) => (
          <PostCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  // 빈 상태
  if (posts.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-16">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            게시물이 없습니다
          </h2>
          <p className="text-sm text-muted-foreground">
            첫 번째 게시물을 작성해보세요!
          </p>
        </div>
      </div>
    );
  }

  // 게시물 목록 렌더링
  return (
    <div className="w-full">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          comments={(post as any).comments || []}
          onPostDeleted={handlePostDeleted}
        />
      ))}
    </div>
  );
}

