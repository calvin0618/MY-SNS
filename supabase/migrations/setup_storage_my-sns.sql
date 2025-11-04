-- Storage 버킷 생성 및 RLS 정책 설정 (my-sns 버킷용)
-- Clerk 인증된 사용자만 자신의 파일에 접근할 수 있도록 제한

-- 1. my-sns 버킷 생성 (이미 존재하면 무시됨)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'my-sns',
  'my-sns',
  false,  -- private bucket
  6291456,  -- 6MB 제한 (6 * 1024 * 1024)
  NULL  -- 모든 파일 타입 허용
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 6291456;

-- 기존 정책 삭제 (이미 존재하는 경우)
DROP POLICY IF EXISTS "Users can upload to own folder my-sns" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files my-sns" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files my-sns" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files my-sns" ON storage.objects;

-- INSERT: 인증된 사용자만 자신의 폴더에 업로드 가능
CREATE POLICY "Users can upload to own folder my-sns"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'my-sns' AND
  (storage.foldername(name))[1] = (auth.jwt()->>'sub')
);

-- SELECT: 인증된 사용자만 자신의 파일 조회 가능
CREATE POLICY "Users can view own files my-sns"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'my-sns' AND
  (storage.foldername(name))[1] = (auth.jwt()->>'sub')
);

-- DELETE: 인증된 사용자만 자신의 파일 삭제 가능
CREATE POLICY "Users can delete own files my-sns"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'my-sns' AND
  (storage.foldername(name))[1] = (auth.jwt()->>'sub')
);

-- UPDATE: 인증된 사용자만 자신의 파일 업데이트 가능
CREATE POLICY "Users can update own files my-sns"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'my-sns' AND
  (storage.foldername(name))[1] = (auth.jwt()->>'sub')
)
WITH CHECK (
  bucket_id = 'my-sns' AND
  (storage.foldername(name))[1] = (auth.jwt()->>'sub')
);

