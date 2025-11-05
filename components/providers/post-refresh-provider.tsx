"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface PostRefreshContextType {
  refreshPosts: () => void;
  setRefreshPosts: (fn: () => void) => void;
}

const PostRefreshContext = createContext<PostRefreshContextType | undefined>(
  undefined
);

/**
 * PostRefreshProvider
 * 게시물 목록 새로고침을 위한 Context Provider
 * 
 * 게시물 작성/삭제 후 피드를 자동으로 업데이트하기 위해 사용
 */
export function PostRefreshProvider({ children }: { children: ReactNode }) {
  const [refreshPosts, setRefreshPostsState] = useState<() => void>(() => () => {});

  const setRefreshPosts = (fn: () => void) => {
    setRefreshPostsState(() => fn);
  };

  return (
    <PostRefreshContext.Provider value={{ refreshPosts, setRefreshPosts }}>
      {children}
    </PostRefreshContext.Provider>
  );
}

/**
 * usePostRefresh 훅
 * 게시물 목록 새로고침 함수를 가져오거나 설정하는 훅
 */
export function usePostRefresh() {
  const context = useContext(PostRefreshContext);
  if (!context) {
    throw new Error("usePostRefresh must be used within PostRefreshProvider");
  }
  return context;
}

