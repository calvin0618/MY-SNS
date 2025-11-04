import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { CreateCommentInput } from "@/lib/types";

/**
 * 댓글 API Routes
 * 
 * POST: 댓글 작성
 * GET: 댓글 목록 조회
 * DELETE: 댓글 삭제
 */

const MAX_COMMENT_LENGTH = 1000;

/**
 * POST /api/comments
 * 댓글 작성
 * 
 * 요구사항:
 * - Clerk 인증 필요
 * - post_id, content 검증
 * - content 길이 제한 (최대 1000자)
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔵 댓글 작성 요청 시작");

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
    const { post_id, content } = body;

    // post_id 검증
    if (!post_id || typeof post_id !== "string") {
      console.log("❌ 잘못된 post_id:", post_id);
      return NextResponse.json(
        { error: "post_id가 필요합니다." },
        { status: 400 }
      );
    }

    // content 검증
    if (!content || typeof content !== "string") {
      console.log("❌ 잘못된 content");
      return NextResponse.json(
        { error: "댓글 내용이 필요합니다." },
        { status: 400 }
      );
    }

    const trimmedContent = content.trim();

    // 빈 문자열 체크
    if (trimmedContent.length === 0) {
      console.log("❌ 빈 댓글 내용");
      return NextResponse.json(
        { error: "댓글 내용을 입력해주세요." },
        { status: 400 }
      );
    }

    // 길이 제한 체크
    if (trimmedContent.length > MAX_COMMENT_LENGTH) {
      console.log("❌ 댓글 길이 초과:", trimmedContent.length);
      return NextResponse.json(
        { error: `댓글은 최대 ${MAX_COMMENT_LENGTH}자까지 입력 가능합니다.` },
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

    // 댓글 데이터 저장
    const commentData: CreateCommentInput = {
      post_id,
      user_id: userId,
      content: trimmedContent,
    };

    const { data: commentRecord, error: commentError } = await supabase
      .from("comments")
      .insert(commentData)
      .select()
      .single();

    if (commentError) {
      console.error("❌ 댓글 작성 실패:", commentError);
      return NextResponse.json(
        { error: "댓글 작성에 실패했습니다.", details: commentError.message },
        { status: 500 }
      );
    }

    // 작성된 댓글의 사용자 정보 조회
    const { data: userData, error: userFetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", commentRecord.user_id)
      .single();

    if (userFetchError) {
      console.error("❌ 사용자 정보 조회 실패:", userFetchError);
      // 댓글은 작성되었지만 사용자 정보를 가져오지 못함
    }

    const commentWithUser = {
      ...commentRecord,
      user: userData || null,
    };

    // 댓글 수 업데이트 (posts 테이블의 comments_count 업데이트)
    // 참고: 현재 posts 테이블에 comments_count 컬럼이 없으면 계산만 수행
    const { count: newCommentsCount } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", post_id);

    console.log("✅ 댓글 작성 성공:", commentWithUser.id, "댓글 수:", newCommentsCount || 0);

    return NextResponse.json(
      {
        success: true,
        comment: commentWithUser,
        comments_count: newCommentsCount || 0,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ 댓글 작성 에러:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/comments
 * 댓글 목록 조회
 * 
 * Query Parameters:
 * - post_id: 게시물 ID (필수)
 * 
 * 반환: CommentWithUser[] (최신 순 정렬)
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🔵 댓글 목록 조회 요청 시작");

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("post_id");

    // post_id 검증
    if (!postId) {
      console.log("❌ post_id 파라미터 누락");
      return NextResponse.json(
        { error: "post_id 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    // Supabase 클라이언트
    const supabase = getServiceRoleClient();

    // 댓글 목록 조회
    const { data: comments, error: commentsError } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: false }); // 최신 순 정렬

    if (commentsError) {
      console.error("❌ 댓글 목록 조회 실패:", commentsError);
      return NextResponse.json(
        { error: "댓글 목록을 불러오는데 실패했습니다.", details: commentsError.message },
        { status: 500 }
      );
    }

    // 각 댓글의 사용자 정보 조회
    const commentsWithUsers = await Promise.all(
      (comments || []).map(async (comment) => {
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", comment.user_id)
          .single();

        return {
          ...comment,
          user: userData || null,
        };
      })
    );

    console.log("✅ 댓글 목록 조회 성공:", commentsWithUsers.length, "개");

    return NextResponse.json(
      {
        success: true,
        comments: commentsWithUsers,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ 댓글 목록 조회 에러:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/comments
 * 댓글 삭제
 * 
 * Query Parameters:
 * - comment_id: 댓글 ID (필수)
 * 
 * 요구사항:
 * - Clerk 인증 필요
 * - 본인 댓글만 삭제 가능
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log("🔴 댓글 삭제 요청 시작");

    // Clerk 인증 확인
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      console.log("❌ 인증되지 않은 사용자");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("comment_id");

    // comment_id 검증
    if (!commentId) {
      console.log("❌ comment_id 파라미터 누락");
      return NextResponse.json(
        { error: "comment_id 파라미터가 필요합니다." },
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

    // 댓글 존재 확인 및 작성자 확인
    const { data: commentData, error: commentError } = await supabase
      .from("comments")
      .select("id, user_id")
      .eq("id", commentId)
      .single();

    if (commentError || !commentData) {
      console.error("❌ 댓글 조회 실패:", commentError);
      return NextResponse.json(
        { error: "댓글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 본인 댓글인지 확인
    if (commentData.user_id !== userId) {
      console.log("❌ 본인 댓글이 아님:", { commentUserId: commentData.user_id, currentUserId: userId });
      return NextResponse.json(
        { error: "본인의 댓글만 삭제할 수 있습니다." },
        { status: 403 }
      );
    }

    // 댓글 삭제
    const { error: deleteError } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) {
      console.error("❌ 댓글 삭제 실패:", deleteError);
      return NextResponse.json(
        { error: "댓글 삭제에 실패했습니다.", details: deleteError.message },
        { status: 500 }
      );
    }

    // 댓글 수 업데이트
    const { count: newCommentsCount } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", commentData.post_id);

    console.log("✅ 댓글 삭제 성공, 댓글 수:", newCommentsCount || 0);

    return NextResponse.json(
      {
        success: true,
        message: "댓글이 삭제되었습니다.",
        comments_count: newCommentsCount || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ 댓글 삭제 에러:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

