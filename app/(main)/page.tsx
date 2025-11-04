"use client";

import { useState } from "react";
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

  // TODO: API 연동 (3-5)
  // useEffect(() => {
  //   fetchPosts();
  // }, []);

  // 현재는 로딩 상태로 표시 (API 연동 후 실제 데이터로 교체)
  // API 연동 전까지는 로딩 상태 유지

  return (
    <div className="w-full">
      <PostFeed posts={posts} loading={loading} />
    </div>
  );
}

