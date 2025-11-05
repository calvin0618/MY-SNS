import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * GET /api/users/[userId]
 * 특정 사용자의 프로필 정보 조회
 * 
 * Returns: 사용자 정보 (게시물 수, 팔로워 수, 팔로잉 수 포함)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    console.log("🔵 사용자 프로필 조회 요청 시작:", userId);

    // Clerk 인증 확인 (선택적 - 로그인하지 않은 사용자도 프로필 볼 수 있음)
    const { userId: clerkUserId } = await auth();

    // Supabase 클라이언트
    let supabase;
    try {
      supabase = getServiceRoleClient();
      console.log("✅ Supabase 클라이언트 초기화 성공 (users-profile)");
    } catch (supabaseError) {
      console.error("❌ Supabase 클라이언트 초기화 실패 (users-profile):", supabaseError);
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
      .select("id, username, full_name, avatar_url, created_at")
      .eq("id", targetUserId)
      .single();

    if (userError || !user) {
      console.error("❌ 사용자 조회 실패:", userError);
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 게시물 수 조회
    const { count: postsCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUserId);

    // 팔로워 수 조회 (following_id가 현재 사용자인 경우)
    const { count: followersCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", targetUserId);

    // 팔로잉 수 조회 (follower_id가 현재 사용자인 경우)
    const { count: followingCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", targetUserId);

    // 현재 사용자가 이 사용자를 팔로우 중인지 확인
    let isFollowing = false;
    let isOwnProfile = false;

    if (clerkUserId) {
      // 현재 사용자의 Supabase user_id 조회
      const { data: currentUser } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", clerkUserId)
        .single();

      if (currentUser) {
        isOwnProfile = currentUser.id === targetUserId;

        if (!isOwnProfile) {
          // 팔로우 여부 확인
          const { data: follow } = await supabase
            .from("follows")
            .select("id")
            .eq("follower_id", currentUser.id)
            .eq("following_id", targetUserId)
            .single();

          isFollowing = !!follow;
        }
      }
    }

    const profile: {
      id: string;
      username: string;
      full_name: string | null;
      avatar_url: string | null;
      created_at: string;
      posts_count: number;
      followers_count: number;
      following_count: number;
      is_following: boolean;
      is_own_profile: boolean;
    } = {
      ...user,
      posts_count: postsCount || 0,
      followers_count: followersCount || 0,
      following_count: followingCount || 0,
      is_following: isFollowing,
      is_own_profile: isOwnProfile,
    };

    console.log("✅ 사용자 프로필 조회 성공:", profile.username);

    return NextResponse.json(
      {
        success: true,
        profile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ 사용자 프로필 조회 에러:", error);
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

/**
 * PATCH /api/users/[userId]
 * 사용자 프로필 정보 수정
 * 
 * Body: { username?: string, full_name?: string, avatar_url?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    console.log("🔵 사용자 프로필 수정 요청 시작:", userId);

    // Clerk 인증 확인
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { username, full_name, avatar_url } = body;

    // Supabase 클라이언트
    let supabase;
    try {
      supabase = getServiceRoleClient();
      console.log("✅ Supabase 클라이언트 초기화 성공 (users-update)");
    } catch (supabaseError) {
      console.error("❌ Supabase 클라이언트 초기화 실패 (users-update):", supabaseError);
      return NextResponse.json(
        { 
          error: "서버 설정 오류입니다.", 
          details: supabaseError instanceof Error ? supabaseError.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // 현재 사용자의 Supabase user_id 조회
    const { data: currentUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .single();

    if (userError || !currentUser) {
      console.error("❌ 현재 사용자 조회 실패:", userError);
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // userId가 Clerk ID인지 확인 (user_로 시작)
    let targetUserId = userId;
    if (userId.startsWith("user_")) {
      const { data: clerkUser, error: clerkUserError } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", userId)
        .single();

      if (clerkUserError || !clerkUser) {
        return NextResponse.json(
          { error: "사용자를 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      targetUserId = clerkUser.id;
    }

    // 본인 프로필만 수정 가능
    if (currentUser.id !== targetUserId) {
      return NextResponse.json(
        { error: "본인 프로필만 수정할 수 있습니다." },
        { status: 403 }
      );
    }

    // 업데이트할 데이터 준비
    const updateData: {
      username?: string;
      full_name?: string | null;
      avatar_url?: string | null;
    } = {};

    if (username !== undefined) {
      if (username.trim().length === 0) {
        return NextResponse.json(
          { error: "사용자명은 필수입니다." },
          { status: 400 }
        );
      }
      updateData.username = username.trim();
    }

    if (full_name !== undefined) {
      updateData.full_name = full_name?.trim() || null;
    }

    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url || null;
    }

    // 사용자 정보 업데이트
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", targetUserId)
      .select("id, username, full_name, avatar_url, created_at")
      .single();

    if (updateError) {
      console.error("❌ 사용자 정보 업데이트 실패:", updateError);
      return NextResponse.json(
        { 
          error: "프로필 수정에 실패했습니다.", 
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    console.log("✅ 사용자 프로필 수정 성공:", updatedUser.username);

    return NextResponse.json(
      {
        success: true,
        user: updatedUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ 사용자 프로필 수정 에러:", error);
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

