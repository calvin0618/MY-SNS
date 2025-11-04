"use client";

import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";

/**
 * Clerk + Supabase 네이티브 통합 클라이언트 (Client Component용)
 *
 * 2025년 4월부터 권장되는 방식:
 * - JWT 템플릿 불필요
 * - useAuth().getToken()으로 현재 세션 토큰 사용
 * - React Hook으로 제공되어 Client Component에서 사용
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * import { useClerkSupabaseClient } from '@/lib/supabase/clerk-client';
 *
 * export default function MyComponent() {
 *   const supabase = useClerkSupabaseClient();
 *
 *   async function fetchData() {
 *     const { data } = await supabase.from('table').select('*');
 *     return data;
 *   }
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useClerkSupabaseClient() {
  const { getToken } = useAuth();

  const supabase = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // 환경 변수 검증
    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Supabase 환경 변수가 설정되지 않았습니다.");
      console.error("다음 환경 변수를 확인하세요:");
      console.error("- NEXT_PUBLIC_SUPABASE_URL");
      console.error("- NEXT_PUBLIC_SUPABASE_ANON_KEY");
      throw new Error(
        "Supabase 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인하세요."
      );
    }

    // 예시 값 체크
    if (
      supabaseUrl.includes("your-project-id") ||
      supabaseUrl.includes("example")
    ) {
      console.error("❌ Supabase URL이 예시 값입니다. 실제 프로젝트 URL로 변경하세요.");
      throw new Error(
        "Supabase URL이 예시 값입니다. Supabase Dashboard에서 실제 프로젝트 URL을 확인하세요."
      );
    }

    console.log("✓ Supabase 클라이언트 초기화 완료:", {
      url: supabaseUrl.substring(0, 30) + "...",
      hasKey: !!supabaseKey,
    });

    const client = createClient(supabaseUrl, supabaseKey, {
      async accessToken() {
        const token = await getToken();
        if (token) {
          console.log("🔑 Clerk 토큰 획득 성공:", token.substring(0, 20) + "...");
        } else {
          console.warn("⚠️ Clerk 토큰을 가져올 수 없습니다. 로그인 상태를 확인하세요.");
        }
        return token ?? null;
      },
    });

    // 주의: accessToken 옵션을 사용할 때는 onAuthStateChange를 사용할 수 없습니다.
    // Clerk의 인증 상태는 Clerk의 useAuth() 훅을 통해 관리됩니다.

    return client;
  }, [getToken]);

  return supabase;
}
