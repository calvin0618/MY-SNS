-- SNS 프로젝트 데이터베이스 스키마 생성
-- Instagram UI 기반 SNS 프로젝트용 테이블 생성
-- 작성일: 2025-11-04

-- ============================================
-- 1. Users 테이블 (기존 테이블 업데이트)
-- ============================================

-- 기존 users 테이블이 있으면 컬럼 추가, 없으면 생성
DO $$ 
BEGIN
    -- users 테이블이 없으면 생성
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        CREATE TABLE public.users (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            clerk_id TEXT NOT NULL UNIQUE,
            username TEXT NOT NULL UNIQUE,
            full_name TEXT,
            bio TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        );
    ELSE
        -- 기존 테이블에 컬럼 추가 (없는 경우만)
        
        -- username 컬럼 추가 (name이 있으면 username으로 변경)
        IF EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'name') THEN
            -- name 컬럼이 있으면 username으로 변경
            ALTER TABLE public.users RENAME COLUMN name TO username;
        ELSIF NOT EXISTS (SELECT FROM information_schema.columns 
                          WHERE table_schema = 'public' 
                          AND table_name = 'users' 
                          AND column_name = 'username') THEN
            ALTER TABLE public.users ADD COLUMN username TEXT UNIQUE;
        END IF;
        
        -- full_name 컬럼 추가
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'users' 
                       AND column_name = 'full_name') THEN
            ALTER TABLE public.users ADD COLUMN full_name TEXT;
        END IF;
        
        -- bio 컬럼 추가
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'users' 
                       AND column_name = 'bio') THEN
            ALTER TABLE public.users ADD COLUMN bio TEXT;
        END IF;
        
        -- avatar_url 컬럼 추가
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'users' 
                       AND column_name = 'avatar_url') THEN
            ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
        END IF;
        
        -- updated_at 컬럼 추가
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'users' 
                       AND column_name = 'updated_at') THEN
            ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;
        END IF;
    END IF;
END $$;

-- updated_at 자동 업데이트 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- users 테이블에 updated_at 트리거 생성
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 테이블 소유자 및 권한 설정
ALTER TABLE public.users OWNER TO postgres;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;

-- ============================================
-- 2. Posts 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

-- updated_at 트리거
DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 테이블 소유자 및 권한 설정
ALTER TABLE public.posts OWNER TO postgres;
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.posts TO anon;
GRANT ALL ON TABLE public.posts TO authenticated;
GRANT ALL ON TABLE public.posts TO service_role;

-- ============================================
-- 3. Likes 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS public.likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    -- 중복 좋아요 방지: 같은 사용자가 같은 게시물에 좋아요를 두 번 할 수 없음
    UNIQUE(post_id, user_id)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);

-- 테이블 소유자 및 권한 설정
ALTER TABLE public.likes OWNER TO postgres;
ALTER TABLE public.likes DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.likes TO anon;
GRANT ALL ON TABLE public.likes TO authenticated;
GRANT ALL ON TABLE public.likes TO service_role;

-- ============================================
-- 4. Comments 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

-- updated_at 트리거
DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 테이블 소유자 및 권한 설정
ALTER TABLE public.comments OWNER TO postgres;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.comments TO anon;
GRANT ALL ON TABLE public.comments TO authenticated;
GRANT ALL ON TABLE public.comments TO service_role;

-- ============================================
-- 5. Follows 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS public.follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    -- 중복 팔로우 방지: 같은 사용자가 같은 사용자를 두 번 팔로우할 수 없음
    UNIQUE(follower_id, following_id),
    -- 자기 자신 팔로우 방지
    CONSTRAINT check_no_self_follow CHECK (follower_id != following_id)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- 테이블 소유자 및 권한 설정
ALTER TABLE public.follows OWNER TO postgres;
ALTER TABLE public.follows DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.follows TO anon;
GRANT ALL ON TABLE public.follows TO authenticated;
GRANT ALL ON TABLE public.follows TO service_role;

-- ============================================
-- 완료 메시지
-- ============================================
DO $$ 
BEGIN
    RAISE NOTICE '✅ SNS 데이터베이스 스키마 생성 완료';
    RAISE NOTICE '   - users 테이블';
    RAISE NOTICE '   - posts 테이블';
    RAISE NOTICE '   - likes 테이블';
    RAISE NOTICE '   - comments 테이블';
    RAISE NOTICE '   - follows 테이블';
END $$;

