"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";
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
import CommentForm from "@/components/comment/CommentForm";
import CommentList from "@/components/comment/CommentList";
import PostModal from "@/components/post/PostModal";
import LoginRequiredModal from "@/components/auth/LoginRequiredModal";

interface PostCardProps {
  post: PostWithUser;
  comments?: CommentWithUser[]; // 댓글 미리보기용 (초기값)
  onLikeUpdate?: (postId: string, isLiked: boolean, likesCount: number) => void; // 좋아요 상태 업데이트 콜백
  onCommentUpdate?: (postId: string) => void; // 댓글 업데이트 콜백
  onPostDeleted?: () => void; // 게시물 삭제 후 콜백
}

/**
 * PostCard 컴포넌트
 * Instagram 스타일의 게시물 카드
 */
export default function PostCard({ post, comments: initialComments = [], onLikeUpdate, onCommentUpdate, onPostDeleted }: PostCardProps) {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const supabase = useClerkSupabaseClient();
  const router = useRouter();
  
  const [imageLoading, setImageLoading] = useState(true);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [doubleTapHeartVisible, setDoubleTapHeartVisible] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);
  
  // 좋아요 상태 관리 (로컬 상태)
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [heartScale, setHeartScale] = useState(1);

  // 팔로우 상태 관리 (로컬 상태)
  const [isFollowing, setIsFollowing] = useState(post.is_following || false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // 댓글 상태 관리
  const [comments, setComments] = useState<CommentWithUser[]>(initialComments);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // PostModal 상태 관리
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  // 로그인 요청 모달 상태 관리
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const { user } = post;

  // 현재 사용자의 Supabase user_id 조회
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      if (!clerkUser?.id) return;

      try {
        const { data, error } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_id", clerkUser.id)
          .single();

        if (!error && data) {
          setCurrentUserId(data.id);
        }
      } catch (error) {
        console.error("❌ 현재 사용자 ID 조회 실패:", error);
      }
    };

    fetchCurrentUserId();
  }, [clerkUser?.id, supabase]);

  // 댓글 목록 로드
  const loadComments = async () => {
    setIsLoadingComments(true);
    console.log("🔵 댓글 목록 로드 시작:", post.id);

    try {
      const response = await fetch(`/api/comments?post_id=${post.id}`);
      const data = await response.json();

      if (!response.ok) {
        console.error("❌ 댓글 목록 로드 실패:", data.error);
        return;
      }

      console.log("✅ 댓글 목록 로드 성공:", data.comments?.length || 0, "개");
      setComments(data.comments || []);
      setCommentsCount(data.comments?.length || 0);
    } catch (error) {
      console.error("❌ 댓글 목록 로드 에러:", error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  // 초기 댓글이 없으면 로드
  useEffect(() => {
    if (initialComments.length === 0 && commentsCount > 0) {
      loadComments();
    } else if (initialComments.length > 0) {
      // 초기 댓글이 있으면 상태에 설정
      setComments(initialComments);
    }
  }, []);

  // 댓글 작성 후 처리
  const handleCommentSubmit = async (content: string) => {
    console.log("✅ 댓글 작성 완료 - 목록 새로고침");
    
    // 댓글 목록 새로고침 (낙관적 업데이트는 CommentForm에서 처리하지 않고 여기서 처리)
    await loadComments();
    
    // 댓글 수 업데이트
    setCommentsCount((prev) => prev + 1);
    
    // 부모 컴포넌트에 알림
    if (onCommentUpdate) {
      onCommentUpdate(post.id);
    }
  };

  // 댓글 삭제 후 처리
  const handleCommentDelete = (commentId: string) => {
    console.log("✅ 댓글 삭제 완료 - 목록 업데이트");
    // 낙관적 업데이트: 댓글 목록에서 제거
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setCommentsCount((prev) => Math.max(0, prev - 1));
    
    // 부모 컴포넌트에 알림
    if (onCommentUpdate) {
      onCommentUpdate(post.id);
    }
  };

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

    // 인증 상태 확인 (로딩 중이거나 인증되지 않은 경우)
    if (!isAuthLoaded || !isUserLoaded) {
      console.log("⏳ 인증 상태 로딩 중...");
      return;
    }

    if (!isSignedIn || !clerkUser) {
      console.log("🔵 로그인 필요 - 모달 표시");
      setIsLoginModalOpen(true);
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
        
        // Unauthorized 에러 시 로그인 팝업 표시
        if (response.status === 401 || data.error === "Unauthorized") {
          setIsLoginModalOpen(true);
          return;
        }
        
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

  // 팔로우/언팔로우 토글 함수
  const handleFollowToggle = async () => {
    // 이미 처리 중이면 무시
    if (isFollowLoading) {
      console.log("⚠️ 팔로우 처리 중입니다.");
      return;
    }

    // 본인 게시물이면 무시
    if (currentUserId === user.id) {
      alert("자신을 팔로워 할 수 없습니다.");
      return;
    }

    // 인증 상태 확인 (로딩 중이거나 인증되지 않은 경우)
    if (!isAuthLoaded || !isUserLoaded) {
      console.log("⏳ 인증 상태 로딩 중...");
      return;
    }

    if (!isSignedIn || !clerkUser) {
      console.log("🔵 로그인 필요 - 모달 표시");
      setIsLoginModalOpen(true);
      return;
    }

    setIsFollowLoading(true);
    console.log("🔵 팔로우 토글 시작:", { userId: user.id, currentIsFollowing: isFollowing });

    try {
      const newIsFollowing = !isFollowing;
      
      // 낙관적 업데이트 (Optimistic Update)
      setIsFollowing(newIsFollowing);

      // API 호출
      const response = await fetch("/api/follows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          following_id: user.id, // Supabase UUID 사용
          action: newIsFollowing ? "follow" : "unfollow",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 실패 시 원래 상태로 복구
        console.error("❌ 팔로우 토글 실패:", {
          status: response.status,
          statusText: response.statusText,
          data,
        });
        setIsFollowing(!newIsFollowing);
        
        // Unauthorized 에러 시 로그인 팝업 표시
        if (response.status === 401 || data.error === "Unauthorized") {
          setIsLoginModalOpen(true);
          return;
        }
        
        // 자기 자신 팔로우 시도 시 명확한 메시지 표시
        if (data.error && data.error.includes("자기 자신")) {
          alert("자신을 팔로워 할 수 없습니다.");
          return;
        }
        
        alert(data.error || data.message || "팔로우 처리에 실패했습니다.");
        return;
      }

      console.log("✅ 팔로우 토글 성공:", data);
    } catch (error) {
      console.error("❌ 팔로우 토글 에러:", error);
      // 에러 발생 시 원래 상태로 복구
      setIsFollowing(!isFollowing);
      alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsFollowLoading(false);
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
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${user.id}`}
                className="text-sm font-semibold text-[#262626] hover:opacity-70"
              >
                {user.username}
              </Link>
              {/* 팔로우 버튼 (본인 게시물이 아닌 경우) */}
              {(!currentUserId || currentUserId !== user.id) && (
                <button
                  onClick={handleFollowToggle}
                  disabled={isFollowLoading || !isAuthLoaded || !isUserLoaded}
                  className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded transition-colors",
                    isFollowLoading || !isAuthLoaded || !isUserLoaded
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : isFollowing
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-[#0095f6] hover:bg-[#1877f2] text-white"
                  )}
                >
                  {isFollowLoading
                    ? "..."
                    : !isAuthLoaded || !isUserLoaded
                    ? "..."
                    : isFollowing
                    ? "팔로잉"
                    : "팔로우"}
                </button>
              )}
            </div>
            <span className="text-xs text-[#8e8e8e]">
              {formatRelativeTime(post.created_at)}
            </span>
          </div>
        </div>

        {/* 메뉴 버튼 (본인 게시물만 표시) */}
        {currentUserId === user.id && (
          <button
            className="text-[#262626] hover:opacity-70 transition-opacity"
            aria-label="게시물 삭제"
            onClick={async () => {
              if (!window.confirm("정말 이 게시물을 삭제하시겠습니까?")) {
                return;
              }

              console.log("🔴 게시물 삭제 시작:", post.id);

              try {
                const response = await fetch(`/api/posts/${post.id}`, {
                  method: "DELETE",
                });

                const data = await response.json();

                if (!response.ok) {
                  console.error("❌ 게시물 삭제 실패:", data.error);
                  alert(data.error || "게시물 삭제에 실패했습니다.");
                  return;
                }

                console.log("✅ 게시물 삭제 성공:", data);

                // 부모 컴포넌트에 알림
                if (onPostDeleted) {
                  onPostDeleted();
                }
              } catch (error) {
                console.error("❌ 게시물 삭제 에러:", error);
                alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
              }
            }}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        )}
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
              setIsPostModalOpen(true);
            }}
            aria-label="댓글"
          >
            <MessageCircle className="w-6 h-6" strokeWidth={2} />
          </button>

          {/* 메시지 버튼 */}
          <button
            className="text-[#262626] hover:opacity-70 transition-opacity"
            onClick={async () => {
              // 인증 상태 확인
              if (!isAuthLoaded || !isUserLoaded) {
                console.log("⏳ 인증 상태 로딩 중...");
                return;
              }

              if (!isSignedIn || !clerkUser) {
                console.log("🔵 로그인 필요 - 로그인 팝업 표시");
                setIsLoginModalOpen(true);
                return;
              }

              // 본인 게시물인 경우 메시지 페이지로만 이동
              if (currentUserId === user.id) {
                router.push("/messages");
                return;
              }

              try {
                console.log("📤 메시지 버튼 클릭 - 사용자:", user.id);
                
                // 대화방 생성/조회
                const response = await fetch("/api/conversations", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    otherUserId: user.id,
                  }),
                });

                const data = await response.json();

                if (!response.ok) {
                  console.error("❌ 대화방 생성/조회 실패:", data.error);
                  
                  // Unauthorized 에러 시 로그인 팝업 표시
                  if (response.status === 401 || data.error === "Unauthorized") {
                    setIsLoginModalOpen(true);
                    return;
                  }
                  
                  alert(data.error || "메시지를 보낼 수 없습니다.");
                  return;
                }

                console.log("✅ 대화방 생성/조회 성공:", data.conversation_id);
                
                // 메시지 페이지로 이동 (대화방 선택된 상태)
                router.push(`/messages?conversation_id=${data.conversation_id}`);
              } catch (error) {
                console.error("❌ 메시지 버튼 클릭 에러:", error);
                alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
              }
            }}
            aria-label="메시지 보내기"
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
        {commentsCount > 0 && (
          <div className="space-y-1">
            {commentsCount > 2 && (
              <button
                className="text-sm text-[#8e8e8e] hover:text-[#262626]"
                onClick={() => {
                  setIsPostModalOpen(true);
                }}
              >
                댓글 {commentsCount.toLocaleString()}개 모두 보기
              </button>
            )}

            {/* 최신 2개 댓글 표시 (CommentList 컴포넌트 사용) */}
            {comments.length > 0 && (
              <CommentList
                comments={comments.slice(0, 2)}
                currentUserId={currentUserId}
                maxHeight="none"
              />
            )}
          </div>
        )}
      </div>

      {/* 댓글 작성 폼 */}
      <CommentForm postId={post.id} onSubmit={handleCommentSubmit} userName={user.username} />

      {/* PostModal */}
      <PostModal
        postId={post.id}
        open={isPostModalOpen}
        onOpenChange={setIsPostModalOpen}
        onPostDeleted={() => {
          if (onPostDeleted) {
            onPostDeleted();
          }
        }}
        onCommentUpdate={() => {
          loadComments();
          if (onCommentUpdate) {
            onCommentUpdate(post.id);
          }
        }}
      />

      {/* 로그인 요청 모달 */}
      <LoginRequiredModal
        open={isLoginModalOpen}
        onOpenChange={setIsLoginModalOpen}
        userName={user.username}
      />
    </article>
  );
}

