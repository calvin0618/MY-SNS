"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";
import Image from "next/image";
import Link from "next/link";
import { UserProfile } from "@/lib/types";
import { PostWithUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import PostModal from "@/components/post/PostModal";
import { Grid3x3, Settings } from "lucide-react";

/**
 * 프로필 페이지
 * Instagram 스타일의 사용자 프로필
 */
export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const supabase = useClerkSupabaseClient();
  const userId = params?.userId as string | undefined;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [currentSupabaseUserId, setCurrentSupabaseUserId] = useState<string | null>(null);

  // 프로필 정보 로드
  const fetchProfile = async () => {
    if (!userId) {
      setError("사용자 ID가 없습니다.");
      setIsLoading(false);
      return;
    }

    try {
      console.log("🔵 프로필 정보 로드 시작:", userId);
      const response = await fetch(`/api/users/${encodeURIComponent(userId)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "프로필을 불러오는데 실패했습니다.");
      }

      console.log("✅ 프로필 정보 로드 성공:", data.profile);
      setProfile(data.profile);
      setIsFollowing(data.profile.is_following || false);
      // Supabase UUID 저장 (팔로우/언팔로우 시 사용)
      setSupabaseUserId(data.profile.id);
    } catch (error) {
      console.error("❌ 프로필 정보 로드 실패:", error);
      setError(error instanceof Error ? error.message : "알 수 없는 오류");
    }
  };

  // 게시물 목록 로드
  const fetchPosts = async () => {
    if (!userId) return;

    try {
      console.log("🔵 게시물 목록 로드 시작:", userId);
      const response = await fetch(`/api/users/${encodeURIComponent(userId)}/posts`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "게시물을 불러오는데 실패했습니다.");
      }

      console.log("✅ 게시물 목록 로드 성공:", data.posts?.length || 0, "개");
      setPosts(data.posts || []);
    } catch (error) {
      console.error("❌ 게시물 목록 로드 실패:", error);
    }
  };

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
          setCurrentSupabaseUserId(data.id);
        }
      } catch (error) {
        console.error("❌ 현재 사용자 ID 조회 실패:", error);
      }
    };

    if (isAuthLoaded && isUserLoaded && isSignedIn && clerkUser) {
      fetchCurrentUserId();
    }
  }, [clerkUser?.id, supabase, isAuthLoaded, isUserLoaded, isSignedIn]);

  // 초기 로드
  useEffect(() => {
    if (userId) {
      setIsLoading(true);
      Promise.all([fetchProfile(), fetchPosts()]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [userId]);

  // 팔로우/언팔로우 처리
  const handleFollowToggle = async () => {
    if (!profile || profile.is_own_profile || !supabaseUserId) return;

    // 자기 자신 팔로우 방지 체크
    if (currentSupabaseUserId && currentSupabaseUserId === supabaseUserId) {
      alert("자신을 팔로워 할 수 없습니다.");
      return;
    }

    // 인증 상태 확인 (로딩 중이거나 인증되지 않은 경우)
    if (!isAuthLoaded || !isUserLoaded) {
      console.log("⏳ 인증 상태 로딩 중...");
      return;
    }

    if (!isSignedIn || !clerkUser) {
      console.error("❌ 인증 상태 확인 실패:", {
        isAuthLoaded,
        isUserLoaded,
        isSignedIn,
        hasUser: !!clerkUser,
      });
      alert("로그인이 필요합니다. 다시 로그인해주세요.");
      return;
    }

    setIsFollowLoading(true);
    try {
      const action = isFollowing ? "unfollow" : "follow";
      console.log("🔵 팔로우 토글:", { action, followingId: supabaseUserId, clerkUserId: clerkUser.id });

      const response = await fetch("/api/follows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          following_id: supabaseUserId, // Supabase UUID 사용
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ 팔로우 API 응답 실패:", {
          status: response.status,
          statusText: response.statusText,
          data,
        });
        
        // 자기 자신 팔로우 시도 시 명확한 메시지 표시
        if (data.error && data.error.includes("자기 자신")) {
          alert("자신을 팔로워 할 수 없습니다.");
          return;
        }
        
        throw new Error(data.error || data.message || "팔로우 처리에 실패했습니다.");
      }

      console.log("✅ 팔로우 토글 성공:", action);
      setIsFollowing(!isFollowing);

      // 프로필 정보 새로고침 (팔로워 수 업데이트)
      await fetchProfile();
    } catch (error) {
      console.error("❌ 팔로우 토글 실패:", error);
      alert(error instanceof Error ? error.message : "팔로우 처리에 실패했습니다.");
    } finally {
      setIsFollowLoading(false);
    }
  };

  // 게시물 클릭 처리
  const handlePostClick = (postId: string) => {
    setSelectedPostId(postId);
    setIsPostModalOpen(true);
  };

  // 프로필 이미지 URL
  const getAvatarUrl = (avatarUrl: string | null, username: string) => {
    if (avatarUrl && avatarUrl.trim() !== "") {
      if (avatarUrl.startsWith("http")) {
        return avatarUrl;
      }
      return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_STORAGE_BUCKET}/${avatarUrl}`;
    }
    // avatar_url이 없을 때는 dicebear 사용
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
  };

  // 이미지 URL
  const getImageUrl = (imageUrl: string) => {
    if (imageUrl.startsWith("http")) {
      return imageUrl;
    }
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_STORAGE_BUCKET}/${imageUrl}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-2">
            {error || "프로필을 찾을 수 없습니다."}
          </p>
          <Button onClick={() => router.push("/")} variant="outline">
            홈으로 가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 프로필 헤더 */}
      <div className="max-w-[935px] mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* 프로필 이미지 */}
          <div className="flex-shrink-0 flex justify-center md:justify-start">
            <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-gray-200">
              <Image
                src={getAvatarUrl(profile.avatar_url, profile.username)}
                alt={profile.username}
                fill
                className="object-cover"
                sizes="128px"
                unoptimized
              />
            </div>
          </div>

          {/* 프로필 정보 */}
          <div className="flex-1 min-w-0">
            {/* 사용자명 및 액션 버튼 */}
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-xl md:text-2xl font-light text-foreground">
                {profile.username}
              </h1>
              {profile.is_own_profile ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/settings")}
                  className="text-sm"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  프로필 편집
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleFollowToggle}
                    disabled={isFollowLoading || !isAuthLoaded || !isUserLoaded || !isSignedIn}
                    variant={isFollowing ? "outline" : "default"}
                    size="sm"
                    className={isFollowing ? "bg-green-500 hover:bg-green-600 text-white border-green-500" : "bg-[#0095f6] hover:bg-[#1877f2] text-white"}
                  >
                    {isFollowLoading
                      ? "처리 중..."
                      : !isAuthLoaded || !isUserLoaded
                      ? "로딩 중..."
                      : isFollowing
                      ? "팔로잉"
                      : "팔로우"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/messages?user_id=${userId}`)}
                  >
                    메시지
                  </Button>
                </>
              )}
            </div>

            {/* 통계 */}
            <div className="flex gap-6 mb-4">
              <div className="text-center md:text-left">
                <span className="font-semibold text-foreground">
                  {profile.posts_count.toLocaleString()}
                </span>
                <span className="text-muted-foreground ml-1">게시물</span>
              </div>
              <div className="text-center md:text-left">
                <span className="font-semibold text-foreground">
                  {profile.followers_count.toLocaleString()}
                </span>
                <span className="text-muted-foreground ml-1">팔로워</span>
              </div>
              <div className="text-center md:text-left">
                <span className="font-semibold text-foreground">
                  {profile.following_count.toLocaleString()}
                </span>
                <span className="text-muted-foreground ml-1">팔로잉</span>
              </div>
            </div>

            {/* 이름 및 설명 */}
            {profile.full_name && (
              <div className="mb-2">
                <p className="font-semibold text-foreground">{profile.full_name}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 게시물 섹션 */}
      <div className="border-t border-border">
        <div className="max-w-[935px] mx-auto">
          {/* 탭 */}
          <div className="flex justify-center border-b border-border">
            <button className="flex items-center gap-2 px-4 py-4 text-sm font-semibold text-foreground border-b-2 border-foreground">
              <Grid3x3 className="w-4 h-4" />
              게시물
            </button>
          </div>

          {/* 게시물 그리드 */}
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 border-2 border-border rounded-full flex items-center justify-center mb-4">
                <Grid3x3 className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-2">게시물 없음</p>
              <p className="text-sm text-muted-foreground">
                {profile.is_own_profile
                  ? "첫 번째 게시물을 공유해보세요!"
                  : "아직 게시물이 없습니다."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-4 p-1 md:p-4">
              {posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => handlePostClick(post.id)}
                  className="relative aspect-square bg-gray-100 overflow-hidden group cursor-pointer"
                >
                  <Image
                    src={getImageUrl(post.image_url)}
                    alt={post.caption || "게시물 이미지"}
                    fill
                    className="object-cover group-hover:opacity-75 transition-opacity"
                    sizes="(max-width: 768px) 33vw, 310px"
                  />
                  {/* 호버 오버레이 */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-4 text-white">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">{post.likes_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">{post.comments_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 게시물 모달 */}
      {selectedPostId && (
        <PostModal
          postId={selectedPostId}
          open={isPostModalOpen}
          onOpenChange={setIsPostModalOpen}
          onPostDeleted={() => {
            fetchPosts();
            setIsPostModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

