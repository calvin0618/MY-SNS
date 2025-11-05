import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * POST /api/follows
 * 팔로우 생성 또는 삭제
 * 
 * Body: { following_id: string, action: "follow" | "unfollow" }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔵 팔로우 요청 시작");

    // Clerk 인증 확인
    const authResult = await auth();
    const clerkUserId = authResult.userId;
    
    console.log("🔍 인증 상태 확인:", {
      hasAuth: !!authResult,
      userId: clerkUserId ? clerkUserId.substring(0, 10) + "..." : null,
    });

    if (!clerkUserId) {
      console.error("❌ 인증 실패: clerkUserId가 없습니다.");
      return NextResponse.json(
        { error: "Unauthorized", message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { following_id, action } = body;

    if (!following_id || !action) {
      return NextResponse.json(
        { error: "following_id와 action이 필요합니다." },
        { status: 400 }
      );
    }

    if (action !== "follow" && action !== "unfollow") {
      return NextResponse.json(
        { error: "action은 'follow' 또는 'unfollow'여야 합니다." },
        { status: 400 }
      );
    }

    // Supabase 클라이언트
    let supabase;
    try {
      supabase = getServiceRoleClient();
      console.log("✅ Supabase 클라이언트 초기화 성공 (follows)");
    } catch (supabaseError) {
      console.error("❌ Supabase 클라이언트 초기화 실패 (follows):", supabaseError);
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

    const followerId = currentUser.id;

    // 자기 자신 팔로우 방지
    if (followerId === following_id) {
      return NextResponse.json(
        { error: "자기 자신을 팔로우할 수 없습니다." },
        { status: 400 }
      );
    }

    if (action === "follow") {
      // 팔로우 생성
      const { data: follow, error: followError } = await supabase
        .from("follows")
        .insert({
          follower_id: followerId,
          following_id: following_id,
        })
        .select()
        .single();

      if (followError) {
        // 이미 팔로우 중인 경우
        if (followError.code === "23505") {
          return NextResponse.json(
            {
              success: true,
              message: "이미 팔로우 중입니다.",
              action: "follow",
            },
            { status: 200 }
          );
        }

        console.error("❌ 팔로우 생성 실패:", followError);
        return NextResponse.json(
          { 
            error: "팔로우에 실패했습니다.", 
            details: followError.message,
          },
          { status: 500 }
        );
      }

      console.log("✅ 팔로우 성공");
      return NextResponse.json(
        {
          success: true,
          message: "팔로우했습니다.",
          action: "follow",
        },
        { status: 201 }
      );
    } else {
      // 언팔로우 (삭제)
      const { error: deleteError } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", followerId)
        .eq("following_id", following_id);

      if (deleteError) {
        console.error("❌ 언팔로우 실패:", deleteError);
        return NextResponse.json(
          { 
            error: "언팔로우에 실패했습니다.", 
            details: deleteError.message,
          },
          { status: 500 }
        );
      }

      console.log("✅ 언팔로우 성공");
      return NextResponse.json(
        {
          success: true,
          message: "언팔로우했습니다.",
          action: "unfollow",
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("❌ 팔로우 에러:", error);
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

