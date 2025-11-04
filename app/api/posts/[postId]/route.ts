import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * 게시물 상세 API Routes
 * 
 * GET: 게시물 상세 조회
 * DELETE: 게시물 삭제
 */

/**
 * GET /api/posts/[postId]
 * 게시물 상세 조회
 * 
 * 반환:
 * - 게시물 정보
 * - 사용자 정보
 * - 좋아요 수
 * - 현재 사용자의 좋아요 여부
 * - 댓글 목록 (사용자 정보 포함)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    console.log("🔵 게시물 상세 조회 요청:", postId);

    // Clerk 인증 확인 (선택적 - 로그인하지 않은 사용자도 조회 가능)
    const { userId: clerkUserId } = await auth();

    // Supabase 클라이언트
    const supabase = getServiceRoleClient();

    // 게시물 정보 조회
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      console.error("❌ 게시물 조회 실패:", postError);
      return NextResponse.json(
        { error: "게시물을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 사용자 정보 조회
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", post.user_id)
      .single();

    if (userError || !user) {
      console.error("❌ 사용자 정보 조회 실패:", userError);
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 좋아요 수 조회
    const { count: likesCount, error: likesError } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (likesError) {
      console.error("❌ 좋아요 수 조회 실패:", likesError);
    }

    // 현재 사용자의 좋아요 여부 확인
    let isLiked = false;
    if (clerkUserId) {
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", clerkUserId)
        .single();

      if (userData) {
        const { data: likeData } = await supabase
          .from("likes")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", userData.id)
          .single();

        isLiked = !!likeData;
      }
    }

    // 댓글 수 조회
    const { count: commentsCount, error: commentsCountError } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (commentsCountError) {
      console.error("❌ 댓글 수 조회 실패:", commentsCountError);
    }

    // 댓글 목록 조회 (사용자 정보 포함)
    const { data: comments, error: commentsError } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });

    // 각 댓글의 사용자 정보 조회
    const commentsWithUsers = await Promise.all(
      (comments || []).map(async (comment) => {
        const { data: commentUser } = await supabase
          .from("users")
          .select("*")
          .eq("id", comment.user_id)
          .single();

        return {
          ...comment,
          user: commentUser || null,
        };
      })
    );

    console.log("✅ 게시물 상세 조회 성공:", {
      postId,
      likesCount: likesCount || 0,
      commentsCount: commentsCount || 0,
    });

    return NextResponse.json(
      {
        success: true,
        post: {
          ...post,
          user,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
          is_liked: isLiked,
        },
        comments: commentsWithUsers,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ 게시물 상세 조회 에러:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/[postId]
 * 게시물 삭제
 * 
 * 요구사항:
 * - Clerk 인증 필요
 * - 본인 게시물만 삭제 가능
 * - Storage 이미지 삭제
 * - DB 레코드 삭제 (CASCADE로 likes, comments도 자동 삭제)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    console.log("🔴 게시물 삭제 요청:", postId);

    // Clerk 인증 확인
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      console.log("❌ 인증되지 않은 사용자");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Supabase 클라이언트
    const supabase = getServiceRoleClient();

    // Clerk 사용자 정보로 Supabase user_id 조회
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

    // 게시물 존재 확인 및 작성자 확인
    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select("id, user_id, image_url")
      .eq("id", postId)
      .single();

    if (postError || !postData) {
      console.error("❌ 게시물 조회 실패:", postError);
      return NextResponse.json(
        { error: "게시물을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 본인 게시물인지 확인
    if (postData.user_id !== userId) {
      console.log("❌ 본인 게시물이 아님:", { postUserId: postData.user_id, currentUserId: userId });
      return NextResponse.json(
        { error: "본인의 게시물만 삭제할 수 있습니다." },
        { status: 403 }
      );
    }

    // Storage 이미지 삭제
    if (postData.image_url) {
      try {
        // image_url에서 파일 경로 추출
        // 예: "posts/{userId}/{timestamp}-{filename}" 또는 전체 URL
        let filePath = postData.image_url;
        
        // 전체 URL인 경우 경로만 추출
        if (filePath.startsWith("http")) {
          // Supabase Storage URL에서 경로 추출
          const urlParts = filePath.split("/storage/v1/object/public/");
          if (urlParts.length > 1) {
            const pathParts = urlParts[1].split("/");
            // 버킷 이름 제외하고 경로만 추출
            filePath = pathParts.slice(1).join("/");
          }
        }

        const bucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "my-sns";
        const { error: storageError } = await supabase.storage
          .from(bucketName)
          .remove([filePath]);

        if (storageError) {
          console.error("⚠️ Storage 이미지 삭제 실패 (계속 진행):", storageError);
          // Storage 삭제 실패해도 DB 삭제는 계속 진행
        } else {
          console.log("✅ Storage 이미지 삭제 성공:", filePath);
        }
      } catch (storageErr) {
        console.error("⚠️ Storage 삭제 에러 (계속 진행):", storageErr);
      }
    }

    // 게시물 삭제 (CASCADE로 likes, comments도 자동 삭제)
    const { error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (deleteError) {
      console.error("❌ 게시물 삭제 실패:", deleteError);
      return NextResponse.json(
        { error: "게시물 삭제에 실패했습니다.", details: deleteError.message },
        { status: 500 }
      );
    }

    console.log("✅ 게시물 삭제 성공");

    return NextResponse.json(
      {
        success: true,
        message: "게시물이 삭제되었습니다.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ 게시물 삭제 에러:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

