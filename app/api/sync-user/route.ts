import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Clerk 사용자를 Supabase users 테이블에 동기화하는 API
 *
 * 클라이언트에서 로그인 후 이 API를 호출하여 사용자 정보를 Supabase에 저장합니다.
 * 이미 존재하는 경우 업데이트하고, 없으면 새로 생성합니다.
 */
export async function POST() {
  try {
    // Clerk 인증 확인
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Clerk에서 사용자 정보 가져오기
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);

    if (!clerkUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Supabase에 사용자 정보 동기화
    const supabase = getServiceRoleClient();

    // 사용자명 생성 (username은 UNIQUE이므로 이메일 주소를 기본값으로 사용)
    const username =
      clerkUser.username ||
      clerkUser.emailAddresses[0]?.emailAddress?.split("@")[0] ||
      `user_${clerkUser.id.substring(0, 8)}`;

    // full_name 설정
    const fullName = clerkUser.fullName || null;

    const { data, error } = await supabase
      .from("users")
      .upsert(
        {
          clerk_id: clerkUser.id,
          username: username,
          full_name: fullName,
        },
        {
          onConflict: "clerk_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Supabase sync error:", error);
      return NextResponse.json(
        { error: "Failed to sync user", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: data,
    });
  } catch (error) {
    console.error("Sync user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
