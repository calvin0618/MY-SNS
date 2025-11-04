"use client";

import { useState, useEffect } from "react";
import PostFeed from "@/components/post/PostFeed";
import { PostWithUser } from "@/lib/types";

/**
 * 홈 페이지
 * 게시물 피드를 표시하는 메인 페이지
 * 
 * 레이아웃: (main) Route Group 레이아웃 적용
 * - Desktop/Tablet: Sidebar 표시
 * - Mobile: Header + Bottom Nav 표시
 */
export default function Home() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostWithUser[]>([]);

  // 게시물 목록 가져오기
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      console.log("🔵 게시물 목록 가져오기 시작");

      try {
        const response = await fetch("/api/posts");
        
        // 응답이 비어있는지 확인
        const text = await response.text();
        console.log("📥 응답 상태:", response.status, response.statusText);
        console.log("📥 응답 텍스트 (처음 500자):", text.substring(0, 500));
        
        let data: any = {};
        
        try {
          data = text ? JSON.parse(text) : {};
          console.log("📥 파싱된 데이터:", data);
        } catch (parseError) {
          console.error("❌ JSON 파싱 실패:", {
            parseError,
            responseText: text,
            textLength: text.length,
            status: response.status,
            statusText: response.statusText,
          });
          setPosts([]);
          setLoading(false);
          return;
        }

        if (!response.ok) {
          const errorInfo = {
            status: response.status,
            statusText: response.statusText,
            error: data?.error || "알 수 없는 오류",
            details: data?.details || data?.message || "상세 정보 없음",
            code: data?.code || "NO_CODE",
            migrationGuide: data?.migrationGuide || null,
            fullResponse: data,
            rawText: text.substring(0, 200), // 처음 200자만
          };
          
          console.error("❌ 게시물 목록 가져오기 실패:", errorInfo);
          
          // 테이블이 없는 경우 명확한 안내 메시지
          if (data?.code === "PGRST205" || data?.details?.includes("Could not find the table")) {
            console.error("🔴 데이터베이스 테이블이 없습니다!");
            console.error("📋 해결 방법:");
            console.error("   1. Supabase Dashboard 접속: https://supabase.com/dashboard");
            console.error("   2. SQL Editor 열기");
            console.error("   3. 다음 파일의 SQL 실행:");
            console.error("      supabase-boilerplate/supabase/migrations/20241104_create_sns_schema.sql");
            console.error("   4. 또는 직접 다음 SQL 실행:");
            console.error("      CREATE TABLE IF NOT EXISTS public.posts (...);");
          }
          
          // 사용자에게 친화적인 메시지 표시 (개발 환경)
          if (data?.migrationGuide) {
            console.warn("⚠️ 마이그레이션 필요:", data.migrationGuide);
          }
          
          setPosts([]);
          setLoading(false);
          return;
        }

        console.log("✅ 게시물 목록 가져오기 성공:", data.posts?.length || 0, "개");
        setPosts(data.posts || []);
      } catch (error) {
        console.error("❌ 게시물 목록 가져오기 예외 발생:", {
          error,
          errorType: typeof error,
          errorConstructor: error?.constructor?.name,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined,
        });
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // 게시물 삭제 후 목록 새로고침
  const handlePostDeleted = () => {
    console.log("✅ 게시물 삭제 완료 - 목록 새로고침");
    // 게시물 목록 다시 가져오기
    const fetchPosts = async () => {
      try {
        const response = await fetch("/api/posts");
        const data = await response.json();

        if (response.ok) {
          setPosts(data.posts || []);
        }
      } catch (error) {
        console.error("❌ 게시물 목록 가져오기 에러:", error);
      }
    };

    fetchPosts();
  };

  return (
    <div className="w-full">
      <PostFeed 
        posts={posts} 
        loading={loading} 
        onPostDeleted={handlePostDeleted}
      />
    </div>
  );
}

