import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * GET /api/users/search?q=검색어
 * 사용자 검색
 * 
 * Returns: 검색된 사용자 목록
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🔵 사용자 검색 요청 시작");

    // Clerk 인증 확인
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = await request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: true,
          users: [],
        },
        { status: 200 }
      );
    }

    // Supabase 클라이언트
    let supabase;
    try {
      supabase = getServiceRoleClient();
      console.log("✅ Supabase 클라이언트 초기화 성공 (users-search)");
    } catch (supabaseError) {
      console.error("❌ Supabase 클라이언트 초기화 실패 (users-search):", supabaseError);
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

    const currentUserId = currentUser.id;
    const searchTerm = query.trim().toLowerCase();

    // 사용자 검색 (username, full_name으로 검색, 자기 자신 제외)
    const { data: users, error: searchError } = await supabase
      .from("users")
      .select("id, username, full_name, avatar_url")
      .neq("id", currentUserId)
      .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
      .limit(20);

    if (searchError) {
      console.error("❌ 사용자 검색 실패:", searchError);
      return NextResponse.json(
        { 
          error: "사용자 검색에 실패했습니다.", 
          details: searchError.message,
        },
        { status: 500 }
      );
    }

    console.log("✅ 사용자 검색 성공:", users?.length || 0, "명");

    return NextResponse.json(
      {
        success: true,
        users: users || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ 사용자 검색 에러:", error);
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

