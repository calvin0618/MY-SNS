"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, X, Home } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * 검색 페이지
 * Instagram 스타일의 사용자 검색 기능
 */
export default function SearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: string;
      username: string;
      full_name: string | null;
      avatar_url: string | null;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 사용자 검색
  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      console.log("🔍 사용자 검색 시작:", query);
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!response.ok) {
        console.error("❌ 사용자 검색 실패:", data.error);
        setError(data.error || "사용자 검색에 실패했습니다.");
        setSearchResults([]);
        return;
      }

      console.log("✅ 사용자 검색 성공:", data.users?.length || 0, "명");
      setSearchResults(data.users || []);
    } catch (error) {
      console.error("❌ 사용자 검색 에러:", error);
      setError("사용자 검색 중 오류가 발생했습니다.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 검색어 변경 시 디바운스 검색
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
        setError(null);
      }
    }, 300); // 300ms 디바운스

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // 프로필 이미지 URL 생성
  const getAvatarUrl = (avatarUrl: string | null, username: string) => {
    if (avatarUrl && avatarUrl.trim() !== "") {
      if (avatarUrl.startsWith("http")) {
        return avatarUrl;
      }
      return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_STORAGE_BUCKET}/${avatarUrl}`;
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 h-[60px] border-b border-[#dbdbdb] bg-white">
        <div className="flex items-center gap-3 flex-1 max-w-2xl mx-auto">
          <Link
            href="/"
            className="text-[#262626] hover:opacity-70 transition-opacity flex-shrink-0"
            aria-label="홈으로 가기"
          >
            <Home className="w-6 h-6" strokeWidth={2} />
          </Link>
          <h1 className="text-xl font-semibold text-[#262626]">검색</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 검색 입력 */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#8e8e8e]" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="사용자 검색..."
            className={cn(
              "pl-10 pr-10 h-12",
              "text-base text-[#262626]",
              "bg-[#efefef] border-0 rounded-lg",
              "focus:bg-white focus:border focus:border-[#262626]",
              "placeholder:text-[#8e8e8e]"
            )}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
                setError(null);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#8e8e8e] hover:text-[#262626] transition-colors"
              aria-label="검색어 지우기"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {/* 검색 결과 */}
        <div>
          {isSearching ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-[#dbdbdb] border-t-[#262626] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-[#8e8e8e]">검색 중...</p>
              </div>
            </div>
          ) : searchQuery.trim() && searchResults.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <p className="text-base font-semibold text-[#262626] mb-2">
                  검색 결과가 없습니다
                </p>
                <p className="text-sm text-[#8e8e8e]">
                  다른 검색어를 시도해보세요.
                </p>
              </div>
            </div>
          ) : !searchQuery.trim() ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Search className="w-12 h-12 text-[#8e8e8e] mx-auto mb-4" />
                <p className="text-base font-semibold text-[#262626] mb-2">
                  사용자 검색
                </p>
                <p className="text-sm text-[#8e8e8e]">
                  사용자 이름이나 이름을 입력하여 검색하세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {searchResults.map((user) => (
                <Link
                  key={user.id}
                  href={`/profile/${user.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {/* 프로필 이미지 */}
                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    <Image
                      src={getAvatarUrl(user.avatar_url, user.username)}
                      alt={user.username}
                      fill
                      className="object-cover"
                      sizes="56px"
                      unoptimized
                    />
                  </div>

                  {/* 사용자 정보 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#262626] truncate">
                      {user.username}
                    </p>
                    {user.full_name && (
                      <p className="text-sm text-[#8e8e8e] truncate">
                        {user.full_name}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

