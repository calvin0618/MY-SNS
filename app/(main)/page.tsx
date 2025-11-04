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
        const data = await response.json();

        if (!response.ok) {
          console.error("❌ 게시물 목록 가져오기 실패:", data.error);
          setPosts([]);
          return;
        }

        console.log("✅ 게시물 목록 가져오기 성공:", data.posts?.length || 0, "개");
        setPosts(data.posts || []);
      } catch (error) {
        console.error("❌ 게시물 목록 가져오기 에러:", error);
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

