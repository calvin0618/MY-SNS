import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { CreatePostInput } from "@/lib/types";

/**
 * 게시물 API Routes
 * 
 * GET: 게시물 목록 조회 (추후 구현)
 * POST: 게시물 생성
 */

/**
 * POST /api/posts
 * 게시물 생성
 * 
 * 요구사항:
 * - Clerk 인증 필요
 * - 이미지 업로드 (최대 5MB)
 * - 캡션 입력 (최대 2,200자)
 * - 파일 경로: posts/{userId}/{timestamp}-{filename}
 */
export async function POST(request: NextRequest) {
  try {
    // Clerk 인증 확인
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // FormData 파싱
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const caption = formData.get("caption") as string | null;

    // 이미지 파일 검증
    if (!imageFile) {
      return NextResponse.json(
        { error: "이미지 파일이 필요합니다." },
        { status: 400 }
      );
    }

    // 파일 크기 검증 (최대 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (imageFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "이미지 파일 크기는 5MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    // 파일 형식 검증 (jpg, png, webp)
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: "지원하지 않는 이미지 형식입니다. (jpg, png, webp만 가능)" },
        { status: 400 }
      );
    }

    // 캡션 길이 검증 (최대 2,200자)
    const MAX_CAPTION_LENGTH = 2200;
    if (caption && caption.length > MAX_CAPTION_LENGTH) {
      return NextResponse.json(
        { error: `캡션은 최대 ${MAX_CAPTION_LENGTH}자까지 입력 가능합니다.` },
        { status: 400 }
      );
    }

    // Supabase 클라이언트
    let supabase;
    try {
      supabase = getServiceRoleClient();
      console.log("✅ Supabase 클라이언트 초기화 성공 (create-post)");
    } catch (supabaseError) {
      console.error("❌ Supabase 클라이언트 초기화 실패 (create-post):", supabaseError);
      return NextResponse.json(
        { 
          error: "서버 설정 오류입니다.", 
          details: supabaseError instanceof Error ? supabaseError.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Clerk 사용자 정보로 Supabase users 테이블에서 user_id 조회
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다. 먼저 로그인해주세요." },
        { status: 404 }
      );
    }

    const userId = userData.id;

    // 파일명 생성: {timestamp}-{random}.{ext}
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const fileExtension = imageFile.name.split(".").pop() || "jpg";
    const fileName = `${timestamp}-${random}.${fileExtension}`;
    const filePath = `posts/${userId}/${fileName}`;

    // Supabase Storage에 이미지 업로드
    const storageBucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "my-sns";
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(filePath, imageFile, {
        contentType: imageFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "이미지 업로드에 실패했습니다.", details: uploadError.message },
        { status: 500 }
      );
    }

    // Public URL 생성
    const { data: urlData } = supabase.storage
      .from(storageBucket)
      .getPublicUrl(filePath);

    const imageUrl = urlData.publicUrl;

    // 게시물 데이터 저장
    const postData: CreatePostInput = {
      user_id: userId,
      image_url: imageUrl,
      caption: caption || null,
    };

    const { data: postRecord, error: postError } = await supabase
      .from("posts")
      .insert(postData)
      .select()
      .single();

    if (postError) {
      console.error("Post creation error:", postError);
      // 업로드된 이미지 삭제 (실패 시 정리)
      await supabase.storage.from(storageBucket).remove([filePath]);
      
      return NextResponse.json(
        { error: "게시물 생성에 실패했습니다.", details: postError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        post: postRecord,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ 게시물 작성 에러:", error);
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
 * GET /api/posts
 * 게시물 목록 조회
 * 
 * Query Parameters:
 * - limit: 페이지당 게시물 수 (기본값: 20)
 * - offset: 건너뛸 게시물 수 (기본값: 0)
 * 
 * 반환:
 * - 게시물 목록 (PostWithUser[])
 * - 시간 역순 정렬
 * - 사용자 정보 포함
 * - 좋아요 수 포함
 * - 댓글 수 포함
 * - 현재 사용자의 좋아요 여부 포함
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🔵 게시물 목록 조회 요청 시작");

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Clerk 인증 확인 (선택적 - 로그인하지 않은 사용자도 조회 가능)
    const { userId: clerkUserId } = await auth();

    // Supabase 클라이언트
    let supabase;
    try {
      supabase = getServiceRoleClient();
      console.log("✅ Supabase 클라이언트 초기화 성공");
    } catch (supabaseError) {
      console.error("❌ Supabase 클라이언트 초기화 실패:", supabaseError);
      return NextResponse.json(
        { 
          error: "서버 설정 오류입니다.", 
          details: supabaseError instanceof Error ? supabaseError.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // 게시물 목록 조회 (시간 역순 정렬)
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) {
      console.error("❌ 게시물 목록 조회 실패:", {
        error: postsError,
        message: postsError.message,
        code: postsError.code,
        details: postsError.details,
        hint: postsError.hint,
      });
      
      // 테이블이 없는 경우 명확한 안내
      const isTableNotFound = 
        postsError.code === "PGRST205" || 
        postsError.message?.includes("Could not find the table") ||
        postsError.message?.includes("relation") ||
        postsError.message?.includes("does not exist");
      
      return NextResponse.json(
        { 
          error: "게시물 목록을 불러오는데 실패했습니다.", 
          details: postsError.message || "Unknown error",
          code: postsError.code || "NO_CODE",
          hint: postsError.hint || null,
          migrationGuide: isTableNotFound ? "데이터베이스 테이블이 없습니다. Supabase Dashboard에서 마이그레이션을 실행하세요." : null,
        },
        { status: 500 }
      );
    }

    if (!posts || posts.length === 0) {
      console.log("✅ 게시물 목록 조회 성공: 0개");
      return NextResponse.json(
        {
          success: true,
          posts: [],
        },
        { status: 200 }
      );
    }

    // 현재 사용자의 Supabase user_id 조회 (좋아요 여부 확인용)
    let currentUserId: string | null = null;
    if (clerkUserId) {
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", clerkUserId)
        .single();

      if (userData) {
        currentUserId = userData.id;
      }
    }

    // 각 게시물에 대한 추가 정보 조회
    const postsWithUser = await Promise.all(
      posts.map(async (post) => {
        // 사용자 정보 조회
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", post.user_id)
          .single();

        if (userError || !user) {
          console.error("❌ 사용자 정보 조회 실패:", userError, "post_id:", post.id);
          return null;
        }

        // 좋아요 수 조회
        const { count: likesCount, error: likesError } = await supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);

        if (likesError) {
          console.error("❌ 좋아요 수 조회 실패:", likesError, "post_id:", post.id);
        }

        // 댓글 수 조회
        const { count: commentsCount, error: commentsCountError } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);

        if (commentsCountError) {
          console.error("❌ 댓글 수 조회 실패:", commentsCountError, "post_id:", post.id);
        }

        // 현재 사용자의 좋아요 여부 확인
        let isLiked = false;
        if (currentUserId) {
          const { data: likeData } = await supabase
            .from("likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", currentUserId)
            .single();

          isLiked = !!likeData;
        }

        // 최신 댓글 2개 조회 (미리보기용)
        const { data: comments, error: commentsError } = await supabase
          .from("comments")
          .select("*")
          .eq("post_id", post.id)
          .order("created_at", { ascending: false })
          .limit(2);

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

        return {
          ...post,
          user,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
          is_liked: isLiked,
          comments: commentsWithUsers,
        };
      })
    );

    // null 값 제거 (사용자 정보 조회 실패한 게시물)
    const validPosts = postsWithUser.filter((post) => post !== null) as any[];

    console.log("✅ 게시물 목록 조회 성공:", validPosts.length, "개");

    return NextResponse.json(
      {
        success: true,
        posts: validPosts,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ 게시물 목록 조회 에러:", error);
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

