# 📌 책갈피 기능 마이그레이션 가이드

## 🚨 중요: 500 에러 해결 방법

책갈피 기능을 사용하려면 `saved_posts` 테이블을 생성해야 합니다.

## 🔧 Supabase Dashboard에서 SQL 실행하기

### 1단계: Supabase Dashboard 접속
1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택

### 2단계: SQL Editor 열기
1. 왼쪽 사이드바에서 **SQL Editor** 클릭
2. **New query** 버튼 클릭

### 3단계: 마이그레이션 실행

아래 SQL을 복사하여 실행하세요:

```sql
-- 책갈피 기능을 위한 saved_posts 테이블 생성
CREATE TABLE IF NOT EXISTS public.saved_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    -- 중복 저장 방지: 같은 사용자가 같은 게시물을 두 번 저장할 수 없음
    UNIQUE(user_id, post_id)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON public.saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON public.saved_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_created_at ON public.saved_posts(created_at DESC);

-- 테이블 소유자 및 권한 설정
ALTER TABLE public.saved_posts OWNER TO postgres;
ALTER TABLE public.saved_posts DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.saved_posts TO anon;
GRANT ALL ON TABLE public.saved_posts TO authenticated;
GRANT ALL ON TABLE public.saved_posts TO service_role;
```

### 4단계: 실행 확인

1. **Table Editor**에서 확인:
   - ✅ `saved_posts` 테이블이 생성되었는지 확인

2. **SQL Editor**에서 확인:
   ```sql
   SELECT * FROM saved_posts LIMIT 1;
   ```
   - 에러가 없으면 테이블이 정상적으로 생성된 것입니다.

## ✅ 완료 후

마이그레이션이 완료되면:
- 북마크 버튼이 정상적으로 작동합니다
- 게시물을 저장/저장 취소할 수 있습니다
- 500 에러가 해결됩니다

## 📝 참고

- 마이그레이션 파일 위치: `supabase/migrations/20250108_create_saved_posts.sql`
- `IF NOT EXISTS`를 사용하므로 여러 번 실행해도 안전합니다
- 기존 데이터에 영향을 주지 않습니다

