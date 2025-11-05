-- 책갈피 기능을 위한 saved_posts 테이블 생성
-- 작성일: 2025-01-08

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

