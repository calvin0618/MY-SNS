import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * GET /api/messages?conversation_id=xxx
 * 특정 대화방의 메시지 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🔵 메시지 목록 조회 요청 시작");

    // Clerk 인증 확인
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = await request.nextUrl.searchParams;
    const conversationId = searchParams.get("conversation_id");

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversation_id가 필요합니다." },
        { status: 400 }
      );
    }

    // Supabase 클라이언트
    let supabase;
    try {
      supabase = getServiceRoleClient();
      console.log("✅ Supabase 클라이언트 초기화 성공 (messages)");
    } catch (supabaseError) {
      console.error("❌ Supabase 클라이언트 초기화 실패 (messages):", supabaseError);
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

    // 대화방 참여 여부 확인
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("user1_id, user2_id")
      .eq("id", conversationId)
      .single();

    if (conversationError || !conversation) {
      console.error("❌ 대화방 조회 실패:", conversationError);
      return NextResponse.json(
        { error: "대화방을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 현재 사용자가 대화방에 참여하지 않은 경우
    if (conversation.user1_id !== currentUserId && conversation.user2_id !== currentUserId) {
      return NextResponse.json(
        { error: "이 대화방에 접근할 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 메시지 목록 조회
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select(`
        id,
        sender_id,
        content,
        is_read,
        created_at,
        sender:users!messages_sender_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("❌ 메시지 목록 조회 실패:", messagesError);
      return NextResponse.json(
        { 
          error: "메시지 목록을 불러오는데 실패했습니다.", 
          details: messagesError.message,
        },
        { status: 500 }
      );
    }

    // 읽지 않은 메시지를 읽음으로 표시 (상대방이 보낸 메시지만)
    const unreadMessages = (messages || []).filter(
      (msg) => !msg.is_read && msg.sender_id !== currentUserId
    );

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map((msg) => msg.id);
      await supabase
        .from("messages")
        .update({ is_read: true })
        .in("id", messageIds);
    }

    console.log("✅ 메시지 목록 조회 성공:", messages?.length || 0, "개");

    return NextResponse.json(
      {
        success: true,
        messages: (messages || []).map((msg) => ({
          id: msg.id,
          sender_id: msg.sender_id,
          content: msg.content,
          is_read: msg.is_read,
          created_at: msg.created_at,
          isFromMe: msg.sender_id === currentUserId,
          sender: msg.sender,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ 메시지 목록 조회 에러:", error);
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
 * POST /api/messages
 * 새 메시지 전송
 * 
 * Body: { conversation_id: string, content: string }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔵 메시지 전송 요청 시작");

    // Clerk 인증 확인
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { conversation_id, content } = body;

    if (!conversation_id || !content) {
      return NextResponse.json(
        { error: "conversation_id와 content가 필요합니다." },
        { status: 400 }
      );
    }

    if (content.trim().length === 0) {
      return NextResponse.json(
        { error: "메시지 내용을 입력해주세요." },
        { status: 400 }
      );
    }

    // Supabase 클라이언트
    let supabase;
    try {
      supabase = getServiceRoleClient();
      console.log("✅ Supabase 클라이언트 초기화 성공 (messages-send)");
    } catch (supabaseError) {
      console.error("❌ Supabase 클라이언트 초기화 실패 (messages-send):", supabaseError);
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

    // 대화방 참여 여부 확인
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("user1_id, user2_id")
      .eq("id", conversation_id)
      .single();

    if (conversationError || !conversation) {
      console.error("❌ 대화방 조회 실패:", conversationError);
      return NextResponse.json(
        { error: "대화방을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 현재 사용자가 대화방에 참여하지 않은 경우
    if (conversation.user1_id !== currentUserId && conversation.user2_id !== currentUserId) {
      return NextResponse.json(
        { error: "이 대화방에 메시지를 보낼 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 메시지 생성
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id,
        sender_id: currentUserId,
        content: content.trim(),
        is_read: false,
      })
      .select(`
        id,
        sender_id,
        content,
        is_read,
        created_at,
        sender:users!messages_sender_id_fkey(id, username, full_name, avatar_url)
      `)
      .single();

    if (messageError) {
      console.error("❌ 메시지 전송 실패:", messageError);
      return NextResponse.json(
        { 
          error: "메시지 전송에 실패했습니다.", 
          details: messageError.message,
        },
        { status: 500 }
      );
    }

    console.log("✅ 메시지 전송 성공:", message.id);

    return NextResponse.json(
      {
        success: true,
        message: {
          id: message.id,
          sender_id: message.sender_id,
          content: message.content,
          is_read: message.is_read,
          created_at: message.created_at,
          isFromMe: true,
          sender: message.sender,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ 메시지 전송 에러:", error);
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

