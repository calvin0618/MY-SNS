import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * POST /api/users/upload-avatar
 * 프로필 이미지 업로드
 * 
 * FormData: { file: File }
 * Returns: { avatar_url: string }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔵 프로필 이미지 업로드 요청 시작");

    // Clerk 인증 확인
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // FormData에서 파일 추출
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 필요합니다." },
        { status: 400 }
      );
    }

    // 파일 타입 검증 (이미지만)
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "이미지 파일만 업로드 가능합니다." },
        { status: 400 }
      );
    }

    // 파일 크기 검증 (최대 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 최대 5MB까지 가능합니다." },
        { status: 400 }
      );
    }

    // Supabase 클라이언트
    let supabase;
    try {
      supabase = getServiceRoleClient();
      console.log("✅ Supabase 클라이언트 초기화 성공 (upload-avatar)");
    } catch (supabaseError) {
      console.error("❌ Supabase 클라이언트 초기화 실패 (upload-avatar):", supabaseError);
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

    const userId = currentUser.id;

    // 기존 프로필 이미지가 있으면 삭제
    const { data: existingUser } = await supabase
      .from("users")
      .select("avatar_url")
      .eq("id", userId)
      .single();

    if (existingUser?.avatar_url && existingUser.avatar_url.startsWith("http") === false) {
      // Supabase Storage 경로인 경우 삭제
      const oldFilePath = existingUser.avatar_url.replace(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_STORAGE_BUCKET}/`,
        ""
      );
      await supabase.storage
        .from(process.env.NEXT_PUBLIC_STORAGE_BUCKET || "uploads")
        .remove([oldFilePath]);
    }

    // 파일명 생성: avatars/{userId}/{timestamp}-{random}.{ext}
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split(".").pop() || "jpg";
    const fileName = `${timestamp}-${random}.${fileExtension}`;
    const filePath = `avatars/${userId}/${fileName}`;

    // Supabase Storage에 이미지 업로드
    const storageBucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "uploads";
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("❌ 이미지 업로드 실패:", uploadError);
      return NextResponse.json(
        { error: "이미지 업로드에 실패했습니다.", details: uploadError.message },
        { status: 500 }
      );
    }

    // Public URL 생성
    const { data: urlData } = supabase.storage
      .from(storageBucket)
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;

    console.log("✅ 프로필 이미지 업로드 성공:", avatarUrl);

    return NextResponse.json(
      {
        success: true,
        avatar_url: avatarUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ 프로필 이미지 업로드 에러:", error);
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

