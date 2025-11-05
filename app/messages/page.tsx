"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Send, Paperclip, Search, X, Home } from "lucide-react";
import { ConversationWithUser, MessageWithUser } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * 메시지 페이지
 * Instagram 스타일의 1:1 메시지 기능
 * 
 * Desktop: 좌측 대화방 목록 + 우측 메시지 화면
 * Mobile: 대화방 목록 또는 메시지 화면 (토글)
 */
export default function MessagesPage() {
  const { user: clerkUser } = useUser();
  const [conversations, setConversations] = useState<ConversationWithUser[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithUser[]>([]);
  const [messageContent, setMessageContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  
  // 새 메시지 작성 관련 상태
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string; full_name: string | null; avatar_url: string | null }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowConversationList(true);
      }
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 대화방 목록 가져오기
  const fetchConversations = async () => {
    try {
      console.log("🔵 대화방 목록 가져오기 시작");
      const response = await fetch("/api/conversations");
      
      console.log("📥 응답 상태:", response.status, response.statusText);
      
      const data = await response.json();
      console.log("📥 응답 데이터:", data);

      if (!response.ok) {
        // 마이그레이션 필요 에러인 경우 특별 처리
        if (data.details?.includes("테이블이 존재하지 않습니다") || data.migrationHint) {
          const migrationMessage = `데이터베이스 마이그레이션이 필요합니다.\n\n` +
            `해결 방법:\n` +
            `1. Supabase Dashboard 접속: https://supabase.com/dashboard\n` +
            `2. SQL Editor 열기\n` +
            `3. supabase/migrations/20241105_create_messages_schema.sql 파일의 전체 내용을 복사하여 실행\n\n` +
            `자세한 안내: MIGRATION_INSTRUCTIONS.md 파일 참고`;
          
          console.error("❌ 마이그레이션 필요:", {
            status: response.status,
            error: data.error,
            details: data.details,
            migrationHint: data.migrationHint,
            fullData: data,
          });
          throw new Error(migrationMessage);
        }
        
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}`
          : data.error || "대화방 목록을 불러오는데 실패했습니다.";
        console.error("❌ 대화방 목록 가져오기 실패:", {
          status: response.status,
          error: data.error,
          details: data.details,
          fullData: data,
        });
        throw new Error(errorMessage);
      }

      console.log("✅ 대화방 목록 가져오기 성공:", data.conversations?.length || 0, "개");
      setConversations(data.conversations || []);
      setError(null);
    } catch (error) {
      console.error("❌ 대화방 목록 가져오기 실패:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "알 수 없는 오류가 발생했습니다.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 메시지 목록 가져오기
  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messages?conversation_id=${conversationId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "메시지를 불러오는데 실패했습니다.");
      }

      setMessages(data.messages || []);
    } catch (error) {
      console.error("❌ 메시지 목록 가져오기 실패:", error);
      setError(error instanceof Error ? error.message : "알 수 없는 오류");
    }
  };

  // 초기 로드
  useEffect(() => {
    if (clerkUser) {
      fetchConversations();
    }
  }, [clerkUser]);

  // URL 쿼리 파라미터에서 conversation_id 읽기
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const conversationId = params.get("conversation_id");
      
      if (conversationId && !selectedConversationId) {
        console.log("📥 URL에서 대화방 ID 읽기:", conversationId);
        setSelectedConversationId(conversationId);
      }
    }
  }, []);

  // 사용자 검색
  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      console.log("🔍 사용자 검색 시작:", query);
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!response.ok) {
        console.error("❌ 사용자 검색 실패:", data.error);
        setError(data.error || "사용자 검색에 실패했습니다.");
        return;
      }

      console.log("✅ 사용자 검색 성공:", data.users?.length || 0, "명");
      setSearchResults(data.users || []);
    } catch (error) {
      console.error("❌ 사용자 검색 에러:", error);
      setError("사용자 검색 중 오류가 발생했습니다.");
    } finally {
      setIsSearching(false);
    }
  };

  // 검색어 변경 시 디바운스 검색
  useEffect(() => {
    if (!showNewMessage) return;

    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300); // 300ms 디바운스

    return () => clearTimeout(timeoutId);
  }, [searchQuery, showNewMessage]);

  // 사용자 선택하여 대화방 생성
  const handleSelectUser = async (userId: string) => {
    try {
      console.log("📤 사용자 선택 - 대화방 생성:", userId);
      
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          otherUserId: userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ 대화방 생성 실패:", data.error);
        alert(data.error || "대화방을 생성할 수 없습니다.");
        return;
      }

      console.log("✅ 대화방 생성 성공:", data.conversation_id);
      
      // 새 메시지 화면 닫기
      setShowNewMessage(false);
      setSearchQuery("");
      setSearchResults([]);
      
      // 대화방 선택
      setSelectedConversationId(data.conversation_id);
    } catch (error) {
      console.error("❌ 사용자 선택 에러:", error);
      alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  // 대화방 선택 시 메시지 로드
  useEffect(() => {
    if (selectedConversationId) {
      fetchMessages(selectedConversationId);
      // 모바일에서는 대화방 선택 시 리스트 숨기기
      if (isMobile) {
        setShowConversationList(false);
      }
    }
  }, [selectedConversationId, isMobile]);

  // 메시지 전송
  const handleSendMessage = async () => {
    if (!selectedConversationId || !messageContent.trim() || isSending) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: selectedConversationId,
          content: messageContent.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "메시지 전송에 실패했습니다.");
      }

      // 메시지 목록에 새 메시지 추가
      setMessages((prev) => [...prev, data.message]);
      setMessageContent("");

      // 대화방 목록 새로고침 (마지막 메시지 업데이트)
      await fetchConversations();
    } catch (error) {
      console.error("❌ 메시지 전송 실패:", error);
      setError(error instanceof Error ? error.message : "메시지 전송에 실패했습니다.");
    } finally {
      setIsSending(false);
    }
  };

  // Enter 키로 메시지 전송
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectedConversation = conversations.find(
    (conv) => conv.id === selectedConversationId
  );

  // 모바일: 새 메시지 작성 화면
  if (isMobile && showNewMessage) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* 헤더 */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 h-[60px] border-b border-[#dbdbdb] bg-white">
          <button
            onClick={() => {
              setShowNewMessage(false);
              setSearchQuery("");
              setSearchResults([]);
            }}
            className="text-[#262626]"
            aria-label="뒤로가기"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-base font-semibold text-[#262626]">새 메시지</h2>
          <Link
            href="/"
            className="text-[#262626] hover:opacity-70 transition-opacity"
            aria-label="홈으로 가기"
          >
            <Home className="w-6 h-6" strokeWidth={2} />
          </Link>
        </header>

        {/* 검색 입력 */}
        <div className="px-4 py-3 border-b border-[#dbdbdb]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#8e8e8e]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="사용자 검색..."
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        {/* 검색 결과 */}
        <div className="flex-1 overflow-y-auto">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-[#8e8e8e]">검색 중...</div>
            </div>
          ) : searchResults.length === 0 && searchQuery.trim() ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-sm text-[#8e8e8e]">검색 결과가 없습니다.</p>
              </div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="divide-y divide-[#dbdbdb]">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  {/* 프로필 이미지 */}
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={user.username}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-300 text-white text-sm font-semibold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* 사용자 정보 */}
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="text-sm font-semibold text-[#262626] truncate">
                      {user.full_name || user.username}
                    </h3>
                    {user.full_name && (
                      <p className="text-sm text-[#8e8e8e] truncate">@{user.username}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-sm text-[#8e8e8e]">사용자 이름을 입력하여 검색하세요.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 모바일: 대화방 목록 보기
  if (isMobile && showConversationList) {
    return (
      <div className="min-h-screen bg-white">
        {/* 헤더 */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 h-[60px] border-b border-[#dbdbdb] bg-white">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-[#262626] hover:opacity-70 transition-opacity"
              aria-label="홈으로 가기"
            >
              <Home className="w-6 h-6" strokeWidth={2} />
            </Link>
            <h1 className="text-xl font-semibold text-[#262626]">메시지</h1>
          </div>
          <button
            onClick={() => setShowNewMessage(true)}
            className="text-[#0095f6] hover:opacity-70 text-sm font-semibold"
            aria-label="새 메시지"
          >
            새로 만들기
          </button>
        </header>

        {/* 대화방 목록 */}
        <div className="overflow-y-auto" style={{ height: "calc(100vh - 60px)" }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full py-16">
              <div className="text-sm text-[#8e8e8e]">로딩 중...</div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full py-16 px-4">
              <div className="text-center max-w-md">
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h2 className="text-lg font-semibold text-red-800 mb-2">
                    데이터베이스 마이그레이션이 필요합니다
                  </h2>
                  <p className="text-sm text-red-700 mb-4 whitespace-pre-line">
                    {error}
                  </p>
                  <div className="text-left bg-white p-3 rounded border border-red-200">
                    <p className="text-xs font-semibold text-red-800 mb-2">마이그레이션 실행 방법:</p>
                    <ol className="text-xs text-red-700 space-y-1 list-decimal list-inside">
                      <li>Supabase Dashboard 접속: <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-[#0095f6] underline">https://supabase.com/dashboard</a></li>
                      <li>SQL Editor 열기</li>
                      <li><code className="bg-gray-100 px-1 rounded">supabase/migrations/20241105_create_messages_schema.sql</code> 파일의 전체 내용을 복사하여 실행</li>
                    </ol>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setError(null);
                    fetchConversations();
                  }}
                  className="mt-4 px-4 py-2 bg-[#0095f6] text-white text-sm font-semibold rounded hover:bg-[#1877f2] transition-colors"
                >
                  다시 시도
                </button>
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 px-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-[#262626] mb-2">
                  메시지가 없습니다
                </h2>
                <p className="text-sm text-[#8e8e8e]">
                  사용자에게 메시지를 보내보세요!
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#dbdbdb]">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  {/* 프로필 이미지 */}
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    {conversation.otherUser.avatar_url ? (
                      <Image
                        src={conversation.otherUser.avatar_url}
                        alt={conversation.otherUser.username}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-300 text-white text-sm font-semibold">
                        {conversation.otherUser.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* 대화방 정보 */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-[#262626] truncate">
                        {conversation.otherUser.full_name || conversation.otherUser.username}
                      </h3>
                      {conversation.lastMessage && (
                        <span className="text-xs text-[#8e8e8e] ml-2 flex-shrink-0">
                          {formatRelativeTime(conversation.lastMessage.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-[#8e8e8e] truncate">
                        {conversation.lastMessage
                          ? conversation.lastMessage.isFromMe
                            ? `나: ${conversation.lastMessage.content}`
                            : conversation.lastMessage.content
                          : "메시지가 없습니다"}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-[#0095f6] text-white text-xs font-semibold rounded-full flex-shrink-0">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 모바일: 메시지 화면
  if (isMobile && !showConversationList && selectedConversation) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* 헤더 */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 h-[60px] border-b border-[#dbdbdb] bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowConversationList(true);
                setSelectedConversationId(null);
              }}
              className="text-[#262626]"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <Link
              href="/"
              className="text-[#262626] hover:opacity-70 transition-opacity"
              aria-label="홈으로 가기"
            >
              <Home className="w-6 h-6" strokeWidth={2} />
            </Link>
          </div>
          <div className="flex items-center gap-3 flex-1 ml-4">
            {/* 프로필 이미지 */}
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200">
              {selectedConversation.otherUser.avatar_url ? (
                <Image
                  src={selectedConversation.otherUser.avatar_url}
                  alt={selectedConversation.otherUser.username}
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-300 text-white text-xs font-semibold">
                  {selectedConversation.otherUser.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <h2 className="text-base font-semibold text-[#262626]">
              {selectedConversation.otherUser.full_name || selectedConversation.otherUser.username}
            </h2>
          </div>
        </header>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ height: "calc(100vh - 60px - 60px)" }}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-[#8e8e8e]">메시지가 없습니다.</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.isFromMe ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-lg px-4 py-2",
                      message.isFromMe
                        ? "bg-[#0095f6] text-white"
                        : "bg-gray-100 text-[#262626]"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    <span
                      className={cn(
                        "text-xs mt-1 block",
                        message.isFromMe ? "text-white/70" : "text-[#8e8e8e]"
                      )}
                    >
                      {formatRelativeTime(message.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* 메시지 입력 영역 */}
        <div className="sticky bottom-0 border-t border-[#dbdbdb] bg-white px-4 py-3">
          {error && (
            <div className="mb-2 text-sm text-red-600">{error}</div>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              disabled
              aria-label="파일 첨부"
            >
              <Paperclip className="w-5 h-5 text-[#8e8e8e]" />
            </Button>
            <Input
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지 입력..."
              className="flex-1"
              disabled={isSending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageContent.trim() || isSending}
              className="flex-shrink-0 bg-[#0095f6] hover:bg-[#1877f2] text-white disabled:opacity-50"
            >
              {isSending ? (
                <span className="text-sm">전송 중...</span>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 데스크톱: 좌측 대화방 목록 + 우측 메시지 화면
  return (
    <div className="min-h-screen bg-white flex">
      {/* 좌측: 대화방 목록 */}
      <div className="w-full md:w-96 border-r border-[#dbdbdb] flex flex-col">
        {/* 헤더 */}
        <header className="flex items-center justify-between px-4 h-[60px] border-b border-[#dbdbdb]">
          <h1 className="text-xl font-semibold text-[#262626]">메시지</h1>
          <button
            onClick={() => setShowNewMessage(true)}
            className="text-[#0095f6] hover:opacity-70 text-sm font-semibold"
            aria-label="새 메시지"
          >
            새로 만들기
          </button>
        </header>

        {/* 대화방 목록 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full py-16">
              <div className="text-sm text-[#8e8e8e]">로딩 중...</div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full py-16 px-4">
              <div className="text-center max-w-md">
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h2 className="text-lg font-semibold text-red-800 mb-2">
                    데이터베이스 마이그레이션이 필요합니다
                  </h2>
                  <p className="text-sm text-red-700 mb-4 whitespace-pre-line">
                    {error}
                  </p>
                  <div className="text-left bg-white p-3 rounded border border-red-200">
                    <p className="text-xs font-semibold text-red-800 mb-2">마이그레이션 실행 방법:</p>
                    <ol className="text-xs text-red-700 space-y-1 list-decimal list-inside">
                      <li>Supabase Dashboard 접속: <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-[#0095f6] underline">https://supabase.com/dashboard</a></li>
                      <li>SQL Editor 열기</li>
                      <li><code className="bg-gray-100 px-1 rounded">supabase/migrations/20241105_create_messages_schema.sql</code> 파일의 전체 내용을 복사하여 실행</li>
                    </ol>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setError(null);
                    fetchConversations();
                  }}
                  className="mt-4 px-4 py-2 bg-[#0095f6] text-white text-sm font-semibold rounded hover:bg-[#1877f2] transition-colors"
                >
                  다시 시도
                </button>
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 px-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-[#262626] mb-2">
                  메시지가 없습니다
                </h2>
                <p className="text-sm text-[#8e8e8e]">
                  사용자에게 메시지를 보내보세요!
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#dbdbdb]">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors",
                    selectedConversationId === conversation.id && "bg-gray-50"
                  )}
                >
                  {/* 프로필 이미지 */}
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    {conversation.otherUser.avatar_url ? (
                      <Image
                        src={conversation.otherUser.avatar_url}
                        alt={conversation.otherUser.username}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-300 text-white text-sm font-semibold">
                        {conversation.otherUser.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* 대화방 정보 */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-[#262626] truncate">
                        {conversation.otherUser.full_name || conversation.otherUser.username}
                      </h3>
                      {conversation.lastMessage && (
                        <span className="text-xs text-[#8e8e8e] ml-2 flex-shrink-0">
                          {formatRelativeTime(conversation.lastMessage.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-[#8e8e8e] truncate">
                        {conversation.lastMessage
                          ? conversation.lastMessage.isFromMe
                            ? `나: ${conversation.lastMessage.content}`
                            : conversation.lastMessage.content
                          : "메시지가 없습니다"}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-[#0095f6] text-white text-xs font-semibold rounded-full flex-shrink-0">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 우측: 메시지 화면 또는 새 메시지 작성 */}
      <div className="flex-1 flex flex-col">
        {showNewMessage ? (
          <>
            {/* 새 메시지 작성 헤더 */}
            <header className="flex items-center justify-between px-4 h-[60px] border-b border-[#dbdbdb]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowNewMessage(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="text-[#262626] hover:opacity-70"
                  aria-label="닫기"
                >
                  <X className="w-6 h-6" />
                </button>
                <h2 className="text-base font-semibold text-[#262626]">새 메시지</h2>
              </div>
              <Link
                href="/"
                className="text-[#262626] hover:opacity-70 transition-opacity"
                aria-label="홈으로 가기"
              >
                <Home className="w-6 h-6" strokeWidth={2} />
              </Link>
            </header>

            {/* 검색 입력 */}
            <div className="px-4 py-3 border-b border-[#dbdbdb]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#8e8e8e]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="사용자 검색..."
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>

            {/* 검색 결과 */}
            <div className="flex-1 overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-[#8e8e8e]">검색 중...</div>
                </div>
              ) : searchResults.length === 0 && searchQuery.trim() ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <p className="text-sm text-[#8e8e8e]">검색 결과가 없습니다.</p>
                  </div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="divide-y divide-[#dbdbdb]">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      {/* 프로필 이미지 */}
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt={user.username}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-300 text-white text-sm font-semibold">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* 사용자 정보 */}
                      <div className="flex-1 min-w-0 text-left">
                        <h3 className="text-sm font-semibold text-[#262626] truncate">
                          {user.full_name || user.username}
                        </h3>
                        {user.full_name && (
                          <p className="text-sm text-[#8e8e8e] truncate">@{user.username}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <p className="text-sm text-[#8e8e8e]">사용자 이름을 입력하여 검색하세요.</p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : selectedConversation ? (
          <>
            {/* 헤더 */}
            <header className="flex items-center justify-between px-4 h-[60px] border-b border-[#dbdbdb]">
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="text-[#262626] hover:opacity-70 transition-opacity"
                  aria-label="홈으로 가기"
                >
                  <Home className="w-6 h-6" strokeWidth={2} />
                </Link>
                {/* 프로필 이미지 */}
                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                  {selectedConversation.otherUser.avatar_url ? (
                    <Image
                      src={selectedConversation.otherUser.avatar_url}
                      alt={selectedConversation.otherUser.username}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-300 text-white text-xs font-semibold">
                      {selectedConversation.otherUser.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <Link
                  href={`/profile/${selectedConversation.otherUser.id}`}
                  className="text-base font-semibold text-[#262626] hover:opacity-70"
                >
                  {selectedConversation.otherUser.full_name || selectedConversation.otherUser.username}
                </Link>
              </div>
            </header>

            {/* 메시지 영역 */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-[#8e8e8e]">메시지가 없습니다.</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.isFromMe ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-lg px-4 py-2",
                        message.isFromMe
                          ? "bg-[#0095f6] text-white"
                          : "bg-gray-100 text-[#262626]"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                      <span
                        className={cn(
                          "text-xs mt-1 block",
                          message.isFromMe ? "text-white/70" : "text-[#8e8e8e]"
                        )}
                      >
                        {formatRelativeTime(message.created_at)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 메시지 입력 영역 */}
            <div className="border-t border-[#dbdbdb] bg-white px-4 py-3">
              {error && (
                <div className="mb-2 text-sm text-red-600">{error}</div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                  disabled
                  aria-label="파일 첨부"
                >
                  <Paperclip className="w-5 h-5 text-[#8e8e8e]" />
                </Button>
                <Input
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="메시지 입력..."
                  className="flex-1"
                  disabled={isSending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageContent.trim() || isSending}
                  className="flex-shrink-0 bg-[#0095f6] hover:bg-[#1877f2] text-white disabled:opacity-50"
                >
                  {isSending ? (
                    <span className="text-sm">전송 중...</span>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-[#262626] mb-2">
                대화방을 선택하세요
              </h2>
              <p className="text-sm text-[#8e8e8e]">
                좌측에서 대화방을 선택하여 메시지를 확인하세요.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

