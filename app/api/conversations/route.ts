import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * GET /api/conversations
 * 현재 사용자의 대화방 목록 조회
 * 
 * Returns: 대화방 목록 (최신 메시지 순으로 정렬)
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🔵 대화방 목록 조회 요청 시작");

    // Clerk 인증 확인
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Supabase 클라이언트
    let supabase;
    try {
      supabase = getServiceRoleClient();
      console.log("✅ Supabase 클라이언트 초기화 성공 (conversations)");
    } catch (supabaseError) {
      console.error("❌ Supabase 클라이언트 초기화 실패 (conversations):", supabaseError);
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

    // 현재 사용자가 참여한 대화방 조회 (user1_id 또는 user2_id가 현재 사용자인 경우)
    console.log("🔍 대화방 조회 시작 - 사용자 ID:", currentUserId);
    
    const { data: conversations, error: conversationsError } = await supabase
      .from("conversations")
      .select("id, user1_id, user2_id, last_message_at, created_at")
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
      .order("last_message_at", { ascending: false });

    if (conversationsError) {
      console.error("❌ 대화방 목록 조회 실패:", {
        error: conversationsError,
        code: conversationsError.code,
        message: conversationsError.message,
        details: conversationsError.details,
        hint: conversationsError.hint,
      });
      
      // 테이블이 없는 경우 특별 처리
      if (conversationsError.code === "PGRST205" || conversationsError.message?.includes("Could not find the table")) {
        return NextResponse.json(
          { 
            error: "대화방 목록을 불러오는데 실패했습니다.", 
            details: "conversations 테이블이 존재하지 않습니다. 마이그레이션을 실행해주세요.",
            migrationHint: "supabase/migrations/20241105_create_messages_schema.sql 파일을 실행하세요.",
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: "대화방 목록을 불러오는데 실패했습니다.", 
          details: conversationsError.message || conversationsError.code || "Unknown error",
          code: conversationsError.code,
        },
        { status: 500 }
      );
    }

    console.log("✅ 대화방 조회 성공:", conversations?.length || 0, "개");

    // 각 대화방의 마지막 메시지와 읽지 않은 메시지 수 조회
    const conversationsWithDetails = await Promise.all(
      (conversations || []).map(async (conversation) => {
        // 대화 상대방 ID 결정
        const otherUserId = 
          conversation.user1_id === currentUserId 
            ? conversation.user2_id 
            : conversation.user1_id;
        
        // 상대방 사용자 정보 조회
        const { data: otherUser, error: userError } = await supabase
          .from("users")
          .select("id, username, full_name, avatar_url")
          .eq("id", otherUserId)
          .single();
        
        if (userError || !otherUser) {
          console.error("❌ 상대방 사용자 정보 조회 실패:", userError, "conversation_id:", conversation.id);
          return null;
        }

        // 마지막 메시지 조회
        const { data: lastMessage } = await supabase
          .from("messages")
          .select("id, content, sender_id, created_at")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // 읽지 않은 메시지 수 조회
        const { count: unreadCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conversation.id)
          .eq("is_read", false)
          .neq("sender_id", currentUserId);

        return {
          id: conversation.id,
          otherUser: {
            id: otherUser.id,
            username: otherUser.username,
            full_name: otherUser.full_name,
            avatar_url: otherUser.avatar_url,
          },
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                sender_id: lastMessage.sender_id,
                created_at: lastMessage.created_at,
                isFromMe: lastMessage.sender_id === currentUserId,
              }
            : null,
          unreadCount: unreadCount || 0,
          last_message_at: conversation.last_message_at,
          created_at: conversation.created_at,
        };
      })
    );
    
    // null 값 필터링 (사용자 정보 조회 실패한 대화방 제외)
    const validConversations = conversationsWithDetails.filter((conv) => conv !== null);

    console.log("✅ 대화방 목록 조회 성공:", validConversations.length, "개");

    return NextResponse.json(
      {
        success: true,
        conversations: validConversations,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ 대화방 목록 조회 에러:", error);
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
 * POST /api/conversations
 * 새 대화방 생성 또는 기존 대화방 조회
 * 
 * Body: { otherUserId: string }
 * Returns: conversation_id
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔵 대화방 생성/조회 요청 시작");

    // Clerk 인증 확인
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { otherUserId } = body;

    if (!otherUserId) {
      return NextResponse.json(
        { error: "상대방 사용자 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // Supabase 클라이언트
    let supabase;
    try {
      supabase = getServiceRoleClient();
      console.log("✅ Supabase 클라이언트 초기화 성공 (conversations-create)");
    } catch (supabaseError) {
      console.error("❌ Supabase 클라이언트 초기화 실패 (conversations-create):", supabaseError);
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

    // 자기 자신과의 대화 방지
    if (currentUserId === otherUserId) {
      return NextResponse.json(
        { error: "자기 자신과는 대화할 수 없습니다." },
        { status: 400 }
      );
    }

    // 기존 대화방 확인 (user1_id와 user2_id 순서는 상관없음)
    const { data: existingConversation } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${currentUserId})`)
      .single();

    if (existingConversation) {
      console.log("✅ 기존 대화방 조회 성공:", existingConversation.id);
      return NextResponse.json(
        {
          success: true,
          conversation_id: existingConversation.id,
          isNew: false,
        },
        { status: 200 }
      );
    }

    // 새 대화방 생성 (user1_id < user2_id 순서로 정렬하여 중복 방지)
    const user1Id = currentUserId < otherUserId ? currentUserId : otherUserId;
    const user2Id = currentUserId < otherUserId ? otherUserId : currentUserId;

    const { data: newConversation, error: createError } = await supabase
      .from("conversations")
      .insert({
        user1_id: user1Id,
        user2_id: user2Id,
      })
      .select()
      .single();

    if (createError) {
      console.error("❌ 대화방 생성 실패:", createError);
      return NextResponse.json(
        { 
          error: "대화방 생성에 실패했습니다.", 
          details: createError.message,
        },
        { status: 500 }
      );
    }

    console.log("✅ 새 대화방 생성 성공:", newConversation.id);

    return NextResponse.json(
      {
        success: true,
        conversation_id: newConversation.id,
        isNew: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ 대화방 생성/조회 에러:", error);
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

