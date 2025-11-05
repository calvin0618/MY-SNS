# 🔧 메시지 기능 마이그레이션 실행 가이드

## 문제
`conversations` 테이블이 존재하지 않아 메시지 기능이 작동하지 않습니다.

## 해결 방법

### 1. Supabase Dashboard 접속
1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택

### 2. SQL Editor 열기
1. 왼쪽 사이드바에서 **SQL Editor** 클릭
2. **New query** 버튼 클릭

### 3. 마이그레이션 SQL 실행
아래 SQL을 **전체 복사**하여 SQL Editor에 붙여넣고 **RUN** 버튼을 클릭하세요:

```sql
-- 메시지 기능 데이터베이스 스키마 생성
-- Instagram 스타일 1:1 메시지 기능
-- 작성일: 2025-11-05

-- ============================================
-- 1. Conversations 테이블 (1:1 대화방)
-- ============================================

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    -- 두 사용자 간에는 하나의 대화방만 존재
    UNIQUE(user1_id, user2_id),
    -- 자기 자신과의 대화 방지
    CONSTRAINT check_no_self_conversation CHECK (user1_id != user2_id)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_conversations_user1_id ON public.conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2_id ON public.conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

-- updated_at 트리거
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 테이블 소유자 및 권한 설정
ALTER TABLE public.conversations OWNER TO postgres;
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.conversations TO anon;
GRANT ALL ON TABLE public.conversations TO authenticated;
GRANT ALL ON TABLE public.conversations TO service_role;

-- ============================================
-- 2. Messages 테이블 (메시지 내용)
-- ============================================

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);

-- updated_at 트리거
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 메시지 생성 시 대화방의 last_message_at 업데이트 트리거
CREATE OR REPLACE FUNCTION update_conversation_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversation_last_message_trigger ON public.messages;
CREATE TRIGGER update_conversation_last_message_trigger
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message_at();

-- 테이블 소유자 및 권한 설정
ALTER TABLE public.messages OWNER TO postgres;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.messages TO anon;
GRANT ALL ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages TO service_role;

-- ============================================
-- 완료 메시지
-- ============================================
DO $$ 
BEGIN
    RAISE NOTICE '✅ 메시지 기능 데이터베이스 스키마 생성 완료';
    RAISE NOTICE '   - conversations 테이블';
    RAISE NOTICE '   - messages 테이블';
END $$;
```

### 4. 실행 확인
실행 후 **Table Editor**에서 다음 테이블들이 생성되었는지 확인:
- ✅ `conversations` 테이블
- ✅ `messages` 테이블

### 5. 완료 후
페이지를 새로고침하면 메시지 기능이 정상 작동합니다.

## ⚠️ 주의사항
- `IF NOT EXISTS`를 사용하므로 기존 데이터를 보호합니다
- 같은 마이그레이션을 여러 번 실행해도 안전합니다
- 에러가 발생하면 에러 메시지를 확인하고 다시 시도하세요

