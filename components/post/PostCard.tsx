"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreVertical,
} from "lucide-react";
import { PostWithUser, CommentWithUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/date";
import { isTextOverflow } from "@/lib/utils/text";

interface PostCardProps {
  post: PostWithUser;
  comments?: CommentWithUser[]; // 댓글 미리보기용 (최신 2개)
  onLikeUpdate?: (postId: string, isLiked: boolean, likesCount: number) => void; // 좋아요 상태 업데이트 콜백
}

/**
 * PostCard 컴포넌트
 * Instagram 스타일의 게시물 카드
 */
export default function PostCard({ post, comments = [], onLikeUpdate }: PostCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [doubleTapHeartVisible, setDoubleTapHeartVisible] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);
  
  // 좋아요 상태 관리 (로컬 상태)
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [heartScale, setHeartScale] = useState(1);

  const { user, comments_count = 0 } = post;

  // 캡션 텍스트 처리
  const captionText = post.caption || "";
  const isCaptionOverflow = isTextOverflow(captionText, 2);
  const displayCaption = showFullCaption
    ? captionText
    : isCaptionOverflow
    ? captionText.slice(0, 100) + "..."
    : captionText;

  // 좋아요 토글 함수
  const handleLikeToggle = async () => {
    // 이미 처리 중이면 무시
    if (isLikeLoading) {
      console.log("⚠️ 좋아요 처리 중입니다.");
      return;
    }

    setIsLikeLoading(true);
    console.log("🔵 좋아요 토글 시작:", { postId: post.id, currentIsLiked: isLiked });

    try {
      const newIsLiked = !isLiked;
      
      // 낙관적 업데이트 (Optimistic Update)
      setIsLiked(newIsLiked);
      setLikesCount((prev) => (newIsLiked ? prev + 1 : Math.max(0, prev - 1)));
      
      // 하트 애니메이션 (scale 1.3 → 1)
      setHeartScale(1.3);
      setTimeout(() => setHeartScale(1), 150);

      // API 호출
      const response = await fetch("/api/likes", {
        method: newIsLiked ? "POST" : "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ post_id: post.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 실패 시 원래 상태로 복구
        console.error("❌ 좋아요 토글 실패:", data.error);
        setIsLiked(!newIsLiked);
        setLikesCount((prev) => (newIsLiked ? Math.max(0, prev - 1) : prev + 1));
        
        // 에러 메시지 표시 (선택적)
        alert(data.error || "좋아요 처리에 실패했습니다.");
        return;
      }

      console.log("✅ 좋아요 토글 성공:", data);

      // 부모 컴포넌트에 상태 업데이트 알림
      if (onLikeUpdate) {
        onLikeUpdate(post.id, newIsLiked, newIsLiked ? likesCount + 1 : Math.max(0, likesCount - 1));
      }
    } catch (error) {
      console.error("❌ 좋아요 토글 에러:", error);
      // 에러 발생 시 원래 상태로 복구
      setIsLiked(!isLiked);
      setLikesCount((prev) => (isLiked ? prev + 1 : Math.max(0, prev - 1)));
      alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLikeLoading(false);
    }
  };

  // 더블탭 이벤트 처리
  const handleDoubleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;

    if (tapLength < 300 && tapLength > 0) {
      // 더블탭 감지
      setDoubleTapHeartVisible(true);
      setTimeout(() => setDoubleTapHeartVisible(false), 1000);

      // 좋아요 토글 (이미 좋아요가 되어 있지 않은 경우에만)
      if (!isLiked) {
        handleLikeToggle();
      }
    }

    setLastTapTime(currentTime);
  };

  // 이미지 URL 생성 (Supabase Storage URL)
  const imageUrl = post.image_url.startsWith("http")
    ? post.image_url
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_STORAGE_BUCKET}/${post.image_url}`;

  // 프로필 이미지 URL
  const avatarUrl =
    user.avatar_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`;

  return (
    <article className="bg-white border border-[#dbdbdb] rounded-none mb-4">
      {/* 헤더 섹션 (60px) */}
      <header className="flex items-center justify-between px-4 h-[60px]">
        <div className="flex items-center gap-3">
          {/* 프로필 이미지 */}
          <Link href={`/profile/${user.id}`}>
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200">
              {user.avatar_url ? (
                <Image
                  src={avatarUrl}
                  alt={user.username}
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-300 text-white text-xs font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </Link>

          {/* 사용자명 및 시간 */}
          <div className="flex flex-col">
            <Link
              href={`/profile/${user.id}`}
              className="text-sm font-semibold text-[#262626] hover:opacity-70"
            >
              {user.username}
            </Link>
            <span className="text-xs text-[#8e8e8e]">
              {formatRelativeTime(post.created_at)}
            </span>
          </div>
        </div>

        {/* 메뉴 버튼 */}
        <button
          className="text-[#262626] hover:opacity-70 transition-opacity"
          aria-label="더보기 메뉴"
          onClick={() => {
            // TODO: 드롭다운 메뉴 구현 (7-3)
          }}
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </header>

      {/* 이미지 영역 (1:1 정사각형) */}
      <div
        className="relative aspect-square bg-gray-100 cursor-pointer"
        onDoubleClick={handleDoubleTap}
      >
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#dbdbdb] border-t-[#262626] rounded-full animate-spin" />
          </div>
        )}

        <Image
          src={imageUrl}
          alt={post.caption || "게시물 이미지"}
          fill
          className={cn(
            "object-cover",
            imageLoading && "opacity-0"
          )}
          sizes="(max-width: 768px) 100vw, 630px"
          onLoad={() => setImageLoading(false)}
          onError={() => setImageLoading(false)}
        />

        {/* 더블탭 하트 애니메이션 */}
        {doubleTapHeartVisible && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <Heart
              className="w-24 h-24 text-[#ed4956] fill-[#ed4956]"
              style={{
                animation: "doubleTapHeart 1s ease-out forwards",
              }}
              strokeWidth={3}
            />
          </div>
        )}
      </div>

      {/* 액션 버튼 영역 (48px) */}
      <div className="flex items-center justify-between px-4 py-2 h-12">
        <div className="flex items-center gap-4">
          {/* 좋아요 버튼 */}
          <button
            className={cn(
              "transition-transform hover:scale-110 active:scale-95",
              "focus:outline-none",
              isLikeLoading && "opacity-50 cursor-wait"
            )}
            onClick={handleLikeToggle}
            disabled={isLikeLoading}
            aria-label={isLiked ? "좋아요 취소" : "좋아요"}
          >
            <Heart
              className={cn(
                "w-6 h-6 transition-colors",
                isLiked
                  ? "text-[#ed4956] fill-[#ed4956]"
                  : "text-[#262626]"
              )}
              style={{
                transform: `scale(${heartScale})`,
                transition: "transform 0.15s ease-out",
              }}
              strokeWidth={isLiked ? 2.5 : 2}
            />
          </button>

          {/* 댓글 버튼 */}
          <button
            className="text-[#262626] hover:opacity-70 transition-opacity"
            onClick={() => {
              // TODO: PostModal 열기 (7-1)
              console.log("Open post modal:", post.id);
            }}
            aria-label="댓글"
          >
            <MessageCircle className="w-6 h-6" strokeWidth={2} />
          </button>

          {/* 공유 버튼 (UI만) */}
          <button
            className="text-[#262626] hover:opacity-70 transition-opacity cursor-not-allowed opacity-50"
            disabled
            aria-label="공유"
          >
            <Send className="w-6 h-6" strokeWidth={2} />
          </button>
        </div>

        {/* 북마크 버튼 (UI만) */}
        <button
          className="text-[#262626] hover:opacity-70 transition-opacity cursor-not-allowed opacity-50"
          disabled
          aria-label="저장"
        >
          <Bookmark className="w-6 h-6" strokeWidth={2} />
        </button>
      </div>

      {/* 컨텐츠 섹션 */}
      <div className="px-4 pb-4 space-y-2">
        {/* 좋아요 수 */}
        {likesCount > 0 && (
          <div className="text-sm font-semibold text-[#262626]">
            좋아요 {likesCount.toLocaleString()}개
          </div>
        )}

        {/* 캡션 */}
        {captionText && (
          <div className="text-sm text-[#262626]">
            <Link
              href={`/profile/${user.id}`}
              className="font-semibold hover:opacity-70 mr-1"
            >
              {user.username}
            </Link>
            <span>{displayCaption}</span>
            {isCaptionOverflow && !showFullCaption && (
              <button
                className="text-[#8e8e8e] hover:text-[#262626] ml-1"
                onClick={() => setShowFullCaption(true)}
              >
                더 보기
              </button>
            )}
            {isCaptionOverflow && showFullCaption && (
              <button
                className="text-[#8e8e8e] hover:text-[#262626] ml-1"
                onClick={() => setShowFullCaption(false)}
              >
                숨기기
              </button>
            )}
          </div>
        )}

        {/* 댓글 미리보기 */}
        {comments_count > 0 && (
          <div className="space-y-1">
            <button
              className="text-sm text-[#8e8e8e] hover:text-[#262626]"
              onClick={() => {
                // TODO: PostModal 열기 (7-1)
                console.log("View all comments:", post.id);
              }}
            >
              댓글 {comments_count.toLocaleString()}개 모두 보기
            </button>

            {/* 최신 2개 댓글 표시 */}
            {comments.slice(0, 2).map((comment) => (
              <div key={comment.id} className="text-sm text-[#262626]">
                <Link
                  href={`/profile/${comment.user.id}`}
                  className="font-semibold hover:opacity-70 mr-1"
                >
                  {comment.user.username}
                </Link>
                <span>{comment.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

