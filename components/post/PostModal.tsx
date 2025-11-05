"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useUser, useAuth } from "@clerk/nextjs";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreVertical,
  X,
  ArrowLeft,
} from "lucide-react";
import { PostWithUser, CommentWithUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/date";
import { isTextOverflow } from "@/lib/utils/text";
import CommentList from "@/components/comment/CommentList";
import CommentForm from "@/components/comment/CommentForm";
import { Button } from "@/components/ui/button";
import LoginRequiredModal from "@/components/auth/LoginRequiredModal";

interface PostModalProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostDeleted?: () => void; // 게시물 삭제 후 콜백
  onCommentUpdate?: () => void; // 댓글 업데이트 후 콜백
}

/**
 * PostModal 컴포넌트
 * 게시물 상세 모달 (Instagram 스타일)
 * Desktop: 모달 형태 (이미지 50% + 댓글 50%)
 * Mobile: 전체 페이지
 */
export default function PostModal({
  postId,
  open,
  onOpenChange,
  onPostDeleted,
  onCommentUpdate,
}: PostModalProps) {
  const router = useRouter();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const supabase = useClerkSupabaseClient();

  const [post, setPost] = useState<PostWithUser | null>(null);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState(false);

  // 좋아요 상태 관리
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [heartScale, setHeartScale] = useState(1);

  // 로그인 요청 모달 상태 관리
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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

  // 게시물 상세 정보 로드
  useEffect(() => {
    if (!open || !postId) return;

    const loadPost = async () => {
      setIsLoading(true);
      setError(null);
      console.log("🔵 게시물 상세 로드 시작:", postId);

      try {
        const response = await fetch(`/api/posts/${postId}`);
        const data = await response.json();

        if (!response.ok) {
          console.error("❌ 게시물 상세 로드 실패:", data.error);
          setError(data.error || "게시물을 불러올 수 없습니다.");
          return;
        }

        console.log("✅ 게시물 상세 로드 성공:", data);
        setPost(data.post);
        setComments(data.comments || []);
        setIsLiked(data.post.is_liked || false);
        setLikesCount(data.post.likes_count || 0);
      } catch (error) {
        console.error("❌ 게시물 상세 로드 에러:", error);
        setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPost();
  }, [open, postId]);

  // 좋아요 토글
  const handleLikeToggle = async () => {
    if (isLikeLoading || !post) return;

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
    console.log("🔵 좋아요 토글 시작:", { postId, currentIsLiked: isLiked });

    try {
      const newIsLiked = !isLiked;

      // 낙관적 업데이트
      setIsLiked(newIsLiked);
      setLikesCount((prev) => (newIsLiked ? prev + 1 : Math.max(0, prev - 1)));

      // 하트 애니메이션
      setHeartScale(1.3);
      setTimeout(() => setHeartScale(1), 150);

      // API 호출
      const response = await fetch("/api/likes", {
        method: newIsLiked ? "POST" : "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ post_id: postId }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ 좋아요 토글 실패:", data.error);
        setIsLiked(!newIsLiked);
        setLikesCount((prev) => (newIsLiked ? Math.max(0, prev - 1) : prev + 1));
        
        // Unauthorized 에러 시 로그인 팝업 표시
        if (response.status === 401 || data.error === "Unauthorized") {
          setIsLoginModalOpen(true);
          return;
        }
        
        alert(data.error || "좋아요 처리에 실패했습니다.");
        return;
      }

      console.log("✅ 좋아요 토글 성공:", data);
    } catch (error) {
      console.error("❌ 좋아요 토글 에러:", error);
      setIsLiked(!isLiked);
      setLikesCount((prev) => (isLiked ? prev + 1 : Math.max(0, prev - 1)));
      alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLikeLoading(false);
    }
  };

  // 게시물 삭제
  const handleDelete = async () => {
    if (!post || !window.confirm("정말 이 게시물을 삭제하시겠습니까?")) {
      return;
    }

    setIsDeleting(true);
    console.log("🔴 게시물 삭제 시작:", postId);

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ 게시물 삭제 실패:", data.error);
        alert(data.error || "게시물 삭제에 실패했습니다.");
        return;
      }

      console.log("✅ 게시물 삭제 성공:", data);

      // 모달 닫기
      onOpenChange(false);

      // 부모 컴포넌트에 알림
      if (onPostDeleted) {
        onPostDeleted();
      }
    } catch (error) {
      console.error("❌ 게시물 삭제 에러:", error);
      alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsDeleting(false);
    }
  };

  // 댓글 작성 후 처리
  const handleCommentSubmit = async () => {
    console.log("✅ 댓글 작성 완료 - 목록 새로고침");
    // 게시물 정보 다시 로드
    const response = await fetch(`/api/posts/${postId}`);
    const data = await response.json();

    if (response.ok && data.post) {
      setPost(data.post);
      setComments(data.comments || []);
      
      if (onCommentUpdate) {
        onCommentUpdate();
      }
    }
  };

  // 댓글 삭제 후 처리
  const handleCommentDelete = (commentId: string) => {
    console.log("✅ 댓글 삭제 완료 - 목록 업데이트");
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    
    if (post) {
      setPost({
        ...post,
        comments_count: Math.max(0, (post.comments_count || 0) - 1),
      });
    }

    if (onCommentUpdate) {
      onCommentUpdate();
    }
  };

  // Mobile 감지
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 이미지 URL 생성
  const getImageUrl = (imageUrl: string) => {
    if (imageUrl.startsWith("http")) {
      return imageUrl;
    }
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_STORAGE_BUCKET}/${imageUrl}`;
  };

  if (!post && !isLoading && !error) {
    return null;
  }

  if (isMobile && open) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-background">
        {/* Mobile Header */}
        <header className="flex items-center justify-between px-4 h-[60px] border-b border-border">
          <button
            onClick={() => onOpenChange(false)}
            className="text-[#262626] dark:text-white"
            aria-label="뒤로가기"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-base font-semibold text-[#262626] dark:text-white">게시물</h2>
          <div className="w-6" /> {/* Spacer */}
        </header>

        {/* Mobile Content */}
        <div className="overflow-y-auto h-[calc(100vh-60px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full px-4">
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
              >
                닫기
              </Button>
            </div>
          ) : post ? (
            <div className="bg-white">
              {/* 이미지 영역 */}
              <div className="relative aspect-square bg-gray-100">
                <Image
                  src={getImageUrl(post.image_url)}
                  alt={post.caption || "게시물 이미지"}
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
              </div>

              {/* 컨텐츠 영역 */}
              <div className="px-4 py-3 space-y-3">
                {/* 액션 버튼 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleLikeToggle}
                      disabled={isLikeLoading}
                      className={cn(
                        "transition-transform hover:scale-110 active:scale-95",
                        isLikeLoading && "opacity-50 cursor-wait"
                      )}
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
                    <MessageCircle className="w-6 h-6 text-[#262626]" />
                    <button
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
                        if (currentUserId === post.user.id) {
                          onOpenChange(false);
                          router.push("/messages");
                          return;
                        }

                        try {
                          console.log("📤 메시지 버튼 클릭 - 사용자:", post.user.id);
                          
                          // 대화방 생성/조회
                          const response = await fetch("/api/conversations", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              otherUserId: post.user.id,
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
                          
                          // 모달 닫기
                          onOpenChange(false);
                          
                          // 메시지 페이지로 이동 (대화방 선택된 상태)
                          router.push(`/messages?conversation_id=${data.conversation_id}`);
                        } catch (error) {
                          console.error("❌ 메시지 버튼 클릭 에러:", error);
                          alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
                        }
                      }}
                      className="text-[#262626] hover:opacity-70 transition-opacity"
                      aria-label="메시지 보내기"
                    >
                      <Send className="w-6 h-6" />
                    </button>
                  </div>
                  <Bookmark className="w-6 h-6 text-[#262626]" />
                </div>

                {/* 좋아요 수 */}
                {likesCount > 0 && (
                  <div className="text-sm font-semibold text-[#262626]">
                    좋아요 {likesCount.toLocaleString()}개
                  </div>
                )}

                {/* 캡션 */}
                {post.caption && (
                  <div className="text-sm text-[#262626]">
                    <Link
                      href={`/profile/${post.user.id}`}
                      className="font-semibold hover:opacity-70 mr-1"
                    >
                      {post.user.username}
                    </Link>
                    <span>{post.caption}</span>
                  </div>
                )}

                {/* 댓글 목록 */}
                <CommentList
                  comments={comments}
                  onDelete={handleCommentDelete}
                  currentUserId={currentUserId}
                  maxHeight="400px"
                />
              </div>

              {/* 댓글 작성 폼 */}
              <CommentForm postId={postId} onSubmit={handleCommentSubmit} userName={post?.user.username} />
            </div>
          ) : null}
        </div>
      </div>

      {/* 로그인 요청 모달 */}
      <LoginRequiredModal
        open={isLoginModalOpen}
        onOpenChange={setIsLoginModalOpen}
        userName={post?.user.username}
      />
    </>
    );
  }

  // Desktop: 모달 형태
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] max-w-[1000px] p-0 overflow-hidden h-[90vh] flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
            >
              닫기
            </Button>
          </div>
        ) : post ? (
          <div className="flex h-full relative">
            {/* 닫기 버튼 (우측 상단) */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 왼쪽: 이미지 (50%) */}
            <div className="relative w-1/2 bg-black flex items-center justify-center">
              <Image
                src={getImageUrl(post.image_url)}
                alt={post.caption || "게시물 이미지"}
                fill
                className="object-contain"
                sizes="50vw"
              />
            </div>

            {/* 오른쪽: 댓글 영역 (50%) */}
            <div className="w-1/2 flex flex-col bg-white border-l border-[#dbdbdb]">
              {/* 헤더 */}
              <div className="flex items-center justify-between px-4 h-[60px] border-b border-[#dbdbdb]">
                <div className="flex items-center gap-3">
                  <Link href={`/profile/${post.user.id}`}>
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                      {post.user.avatar_url ? (
                        <Image
                          src={post.user.avatar_url}
                          alt={post.user.username}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-300 text-white text-xs font-semibold">
                          {post.user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </Link>
                  <Link
                    href={`/profile/${post.user.id}`}
                    className="text-sm font-semibold text-[#262626] hover:opacity-70"
                  >
                    {post.user.username}
                  </Link>
                </div>

                {/* 게시물 삭제 버튼 (본인 게시물만 표시) */}
                {currentUserId === post.user.id && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-[#262626] hover:opacity-70 transition-opacity disabled:opacity-50"
                    aria-label="게시물 삭제"
                  >
                    {isDeleting ? (
                      <span className="text-sm text-[#ed4956]">삭제 중...</span>
                    ) : (
                      <MoreVertical className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>

              {/* 댓글 목록 (스크롤 가능) */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-3 space-y-3">
                  {/* 액션 버튼 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleLikeToggle}
                        disabled={isLikeLoading}
                        className={cn(
                          "transition-transform hover:scale-110 active:scale-95",
                          isLikeLoading && "opacity-50 cursor-wait"
                        )}
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
                      <MessageCircle className="w-6 h-6 text-[#262626]" />
                      <Send className="w-6 h-6 text-[#262626]" />
                    </div>
                    <Bookmark className="w-6 h-6 text-[#262626]" />
                  </div>

                  {/* 좋아요 수 */}
                  {likesCount > 0 && (
                    <div className="text-sm font-semibold text-[#262626]">
                      좋아요 {likesCount.toLocaleString()}개
                    </div>
                  )}

                  {/* 캡션 */}
                  {post.caption && (
                    <div className="text-sm text-[#262626]">
                      <Link
                        href={`/profile/${post.user.id}`}
                        className="font-semibold hover:opacity-70 mr-1"
                      >
                        {post.user.username}
                      </Link>
                      <span>{post.caption}</span>
                    </div>
                  )}

                  {/* 댓글 목록 */}
                  <CommentList
                    comments={comments}
                    onDelete={handleCommentDelete}
                    currentUserId={currentUserId}
                    maxHeight="none"
                  />
                </div>
              </div>

              {/* 댓글 작성 폼 */}
              <CommentForm postId={postId} onSubmit={handleCommentSubmit} userName={post?.user.username} />
            </div>
          </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* 로그인 요청 모달 */}
      <LoginRequiredModal
        open={isLoginModalOpen}
        onOpenChange={setIsLoginModalOpen}
        userName={post?.user.username}
      />
    </>
  );
}

