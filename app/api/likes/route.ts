import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * 좋아요 API Routes
 * 
 * POST: 좋아요 추가
 * DELETE: 좋아요 제거
 */

/**
 * POST /api/likes
 * 좋아요 추가
 * 
 * 요구사항:
 * - Clerk 인증 필요
 * - 중복 체크 (같은 사용자가 같은 게시물에 좋아요를 두 번 할 수 없음)
 * - Request Body: { post_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔵 좋아요 추가 요청 시작");

    // Clerk 인증 확인
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      console.log("❌ 인증되지 않은 사용자");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Request Body 파싱
    const body = await request.json();
    const { post_id } = body;

    // post_id 검증
    if (!post_id || typeof post_id !== "string") {
      console.log("❌ 잘못된 post_id:", post_id);
      return NextResponse.json(
        { error: "post_id가 필요합니다." },
        { status: 400 }
      );
    }

    // Supabase 클라이언트
    const supabase = getServiceRoleClient();

    // Clerk 사용자 정보로 Supabase users 테이블에서 user_id 조회
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .single();

    if (userError || !userData) {
      console.error("❌ 사용자 정보 조회 실패:", userError);
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다. 먼저 로그인해주세요." },
        { status: 404 }
      );
    }

    const userId = userData.id;
    console.log("✅ 사용자 확인:", userId);

    // 게시물 존재 여부 확인
    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select("id")
      .eq("id", post_id)
      .single();

    if (postError || !postData) {
      console.error("❌ 게시물 조회 실패:", postError);
      return NextResponse.json(
        { error: "게시물을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 중복 체크 (이미 좋아요가 있는지 확인)
    const { data: existingLike, error: checkError } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", post_id)
      .eq("user_id", userId)
      .single();

    if (existingLike) {
      console.log("❌ 이미 좋아요가 존재함");
      return NextResponse.json(
        { error: "이미 좋아요를 누른 게시물입니다." },
        { status: 409 }
      );
    }

    // 좋아요 추가
    const { data: likeData, error: likeError } = await supabase
      .from("likes")
      .insert({
        post_id,
        user_id: userId,
      })
      .select()
      .single();

    if (likeError) {
      console.error("❌ 좋아요 추가 실패:", likeError);
      return NextResponse.json(
        { error: "좋아요 추가에 실패했습니다.", details: likeError.message },
        { status: 500 }
      );
    }

    console.log("✅ 좋아요 추가 성공:", likeData.id);

    return NextResponse.json(
      {
        success: true,
        like: likeData,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ 좋아요 추가 에러:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/likes
 * 좋아요 제거
 * 
 * 요구사항:
 * - Clerk 인증 필요
 * - 좋아요 존재 확인
 * - Request Body: { post_id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log("🔴 좋아요 제거 요청 시작");

    // Clerk 인증 확인
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      console.log("❌ 인증되지 않은 사용자");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Request Body 파싱
    const body = await request.json();
    const { post_id } = body;

    // post_id 검증
    if (!post_id || typeof post_id !== "string") {
      console.log("❌ 잘못된 post_id:", post_id);
      return NextResponse.json(
        { error: "post_id가 필요합니다." },
        { status: 400 }
      );
    }

    // Supabase 클라이언트
    const supabase = getServiceRoleClient();

    // Clerk 사용자 정보로 Supabase users 테이블에서 user_id 조회
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .single();

    if (userError || !userData) {
      console.error("❌ 사용자 정보 조회 실패:", userError);
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다. 먼저 로그인해주세요." },
        { status: 404 }
      );
    }

    const userId = userData.id;
    console.log("✅ 사용자 확인:", userId);

    // 좋아요 존재 확인
    const { data: existingLike, error: checkError } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", post_id)
      .eq("user_id", userId)
      .single();

    if (checkError || !existingLike) {
      console.log("❌ 좋아요가 존재하지 않음");
      return NextResponse.json(
        { error: "좋아요를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 좋아요 제거
    const { error: deleteError } = await supabase
      .from("likes")
      .delete()
      .eq("id", existingLike.id);

    if (deleteError) {
      console.error("❌ 좋아요 제거 실패:", deleteError);
      return NextResponse.json(
        { error: "좋아요 제거에 실패했습니다.", details: deleteError.message },
        { status: 500 }
      );
    }

    console.log("✅ 좋아요 제거 성공");

    return NextResponse.json(
      {
        success: true,
        message: "좋아요가 제거되었습니다.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ 좋아요 제거 에러:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

