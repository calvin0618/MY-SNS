import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * POST /api/saved-posts
 * 게시물을 책갈피에 저장
 * 
 * Body: { post_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔵 게시물 저장 요청 시작");

    // Clerk 인증 확인
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { post_id } = body;

    if (!post_id) {
      return NextResponse.json(
        { error: "post_id는 필수입니다." },
        { status: 400 }
      );
    }

    // Supabase 클라이언트
    let supabase;
    try {
      supabase = getServiceRoleClient();
      console.log("✅ Supabase 클라이언트 초기화 성공 (saved-posts-create)");
    } catch (supabaseError) {
      console.error("❌ Supabase 클라이언트 초기화 실패 (saved-posts-create):", supabaseError);
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

    // 게시물 존재 확인
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id")
      .eq("id", post_id)
      .single();

    if (postError || !post) {
      console.error("❌ 게시물 조회 실패:", postError);
      return NextResponse.json(
        { error: "게시물을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 이미 저장된 게시물인지 확인
    const { data: existingSaved, error: checkError } = await supabase
      .from("saved_posts")
      .select("id")
      .eq("user_id", currentUser.id)
      .eq("post_id", post_id)
      .maybeSingle();

    // 테이블이 없거나 다른 에러인 경우 확인
    if (checkError && checkError.code !== 'PGRST116') {
      console.error("❌ 저장 확인 중 에러:", checkError);
      // 테이블이 없는 경우 에러 메시지 반환
      if (checkError.code === '42P01') {
        return NextResponse.json(
          { error: "데이터베이스 테이블이 생성되지 않았습니다. 마이그레이션을 실행해주세요." },
          { status: 500 }
        );
      }
    }

    if (existingSaved) {
      return NextResponse.json(
        { error: "이미 저장된 게시물입니다." },
        { status: 400 }
      );
    }

    // 저장된 게시물 추가
    const { data: savedPost, error: saveError } = await supabase
      .from("saved_posts")
      .insert({
        user_id: currentUser.id,
        post_id: post_id,
      })
      .select("id, created_at")
      .single();

    if (saveError) {
      console.error("❌ 게시물 저장 실패:", saveError);
      
      // 테이블이 없는 경우
      if (saveError.code === '42P01') {
        return NextResponse.json(
          { 
            error: "데이터베이스 테이블이 생성되지 않았습니다. 마이그레이션을 실행해주세요.",
            details: saveError.message
          },
          { status: 500 }
        );
      }
      
      // 중복 저장 에러 (UNIQUE 제약 조건)
      if (saveError.code === '23505') {
        return NextResponse.json(
          { error: "이미 저장된 게시물입니다." },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          error: "게시물 저장에 실패했습니다.",
          details: saveError.message,
          code: saveError.code
        },
        { status: 500 }
      );
    }

    console.log("✅ 게시물 저장 성공:", post_id);

    return NextResponse.json(
      {
        success: true,
        saved_post: savedPost,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ 게시물 저장 에러:", error);
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
 * DELETE /api/saved-posts
 * 게시물을 책갈피에서 제거
 * 
 * Body: { post_id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log("🔵 게시물 저장 취소 요청 시작");

    // Clerk 인증 확인
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { post_id } = body;

    if (!post_id) {
      return NextResponse.json(
        { error: "post_id는 필수입니다." },
        { status: 400 }
      );
    }

    // Supabase 클라이언트
    let supabase;
    try {
      supabase = getServiceRoleClient();
      console.log("✅ Supabase 클라이언트 초기화 성공 (saved-posts-delete)");
    } catch (supabaseError) {
      console.error("❌ Supabase 클라이언트 초기화 실패 (saved-posts-delete):", supabaseError);
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

    // 저장된 게시물 삭제
    const { error: deleteError } = await supabase
      .from("saved_posts")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("post_id", post_id);

    if (deleteError) {
      console.error("❌ 게시물 저장 취소 실패:", deleteError);
      return NextResponse.json(
        { error: "게시물 저장 취소에 실패했습니다." },
        { status: 500 }
      );
    }

    console.log("✅ 게시물 저장 취소 성공:", post_id);

    return NextResponse.json(
      {
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ 게시물 저장 취소 에러:", error);
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

