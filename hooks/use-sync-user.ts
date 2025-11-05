"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

/**
 * Clerk 사용자를 Supabase DB에 자동으로 동기화하는 훅
 *
 * 사용자가 로그인한 상태에서 이 훅을 사용하면
 * 자동으로 /api/sync-user를 호출하여 Supabase users 테이블에 사용자 정보를 저장합니다.
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * import { useSyncUser } from '@/hooks/use-sync-user';
 *
 * export default function Layout({ children }) {
 *   useSyncUser();
 *   return <>{children}</>;
 * }
 * ```
 */
export function useSyncUser() {
  const { isLoaded, userId } = useAuth();
  const syncedRef = useRef(false);

  useEffect(() => {
    // 이미 동기화했거나, 로딩 중이거나, 로그인하지 않은 경우 무시
    if (syncedRef.current || !isLoaded || !userId) {
      return;
    }

    // 동기화 실행
    const syncUser = async () => {
      try {
        const response = await fetch("/api/sync-user", {
          method: "POST",
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData: any = {};
          
          try {
            errorData = errorText ? JSON.parse(errorText) : {};
          } catch (e) {
            console.error("❌ 사용자 동기화 에러 (JSON 파싱 실패):", errorText);
            return;
          }
          
          console.error("❌ 사용자 동기화 실패:", {
            status: response.status,
            statusText: response.statusText,
            error: errorData.error || "알 수 없는 오류",
            details: errorData.details || errorData.message || "상세 정보 없음",
            fullResponse: errorData,
            rawText: errorText.substring(0, 500),
          });
          return;
        }

        syncedRef.current = true;
      } catch (error) {
        console.error("Error syncing user:", error);
      }
    };

    syncUser();
  }, [isLoaded, userId]);
}
