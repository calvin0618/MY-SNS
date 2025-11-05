import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * GET /api/users/[userId]/posts
 * 특정 사용자의 게시물 목록 조회
 * 
 * Returns: 게시물 목록 (사용자 정보 포함)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    console.log("🔵 사용자 게시물 목록 조회 요청 시작:", userId);

    // Clerk 인증 확인 (선택적)
    const { userId: clerkUserId } = await auth();

    // Supabase 클라이언트
    let supabase;
    try {
      supabase = getServiceRoleClient();
      console.log("✅ Supabase 클라이언트 초기화 성공 (users-posts)");
    } catch (supabaseError) {
      console.error("❌ Supabase 클라이언트 초기화 실패 (users-posts):", supabaseError);
      return NextResponse.json(
        { 
          error: "서버 설정 오류입니다.", 
          details: supabaseError instanceof Error ? supabaseError.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // userId가 Clerk ID인지 확인 (user_로 시작)
    let targetUserId = userId;
    if (userId.startsWith("user_")) {
      // Clerk ID인 경우 Supabase UUID로 변환
      const { data: clerkUser, error: clerkUserError } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", userId)
        .single();

      if (clerkUserError || !clerkUser) {
        console.error("❌ Clerk ID로 사용자 조회 실패:", clerkUserError);
        return NextResponse.json(
          { error: "사용자를 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      targetUserId = clerkUser.id;
      console.log("🔍 Clerk ID를 Supabase UUID로 변환:", userId, "->", targetUserId);
    }

    // 사용자 정보 조회
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, username, full_name, avatar_url")
      .eq("id", targetUserId)
      .single();

    if (userError || !user) {
      console.error("❌ 사용자 조회 실패:", userError);
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 게시물 목록 조회
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id, image_url, caption, created_at, updated_at")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (postsError) {
      console.error("❌ 게시물 목록 조회 실패:", postsError);
      return NextResponse.json(
        { 
          error: "게시물 목록을 불러오는데 실패했습니다.", 
          details: postsError.message,
        },
        { status: 500 }
      );
    }

    // 현재 사용자 정보 조회 (좋아요 여부 확인용)
    let currentUserId: string | null = null;
    if (clerkUserId) {
      const { data: currentUser } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", clerkUserId)
        .single();

      if (currentUser) {
        currentUserId = currentUser.id;
      }
    }

    // 각 게시물에 대한 추가 정보 조회
    const postsWithDetails = await Promise.all(
      (posts || []).map(async (post) => {
        // 좋아요 수 조회
        const { count: likesCount } = await supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);

        // 댓글 수 조회
        const { count: commentsCount } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);

        // 현재 사용자가 좋아요 했는지 확인
        let isLiked = false;
        if (currentUserId) {
          const { data: like } = await supabase
            .from("likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", currentUserId)
            .single();

          isLiked = !!like;
        }

        return {
          ...post,
          user,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
          is_liked: isLiked,
        };
      })
    );

    console.log("✅ 사용자 게시물 목록 조회 성공:", postsWithDetails.length, "개");

    return NextResponse.json(
      {
        success: true,
        posts: postsWithDetails,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ 사용자 게시물 목록 조회 에러:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: errorMessage,
        stack: process.env.NODE_ENV === "development" ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

