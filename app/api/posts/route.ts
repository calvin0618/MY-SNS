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
    const supabase = getServiceRoleClient();

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
    console.error("Create post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/posts
 * 게시물 목록 조회
 * 
 * 추후 구현 예정:
 * - 페이지네이션 (limit, offset)
 * - 시간 역순 정렬
 * - 사용자 정보 포함
 * - 좋아요 수 포함
 * - 댓글 수 포함
 */
export async function GET(request: NextRequest) {
  // TODO: 게시물 목록 조회 구현 (3-5)
  return NextResponse.json(
    { error: "Not implemented yet" },
    { status: 501 }
  );
}

