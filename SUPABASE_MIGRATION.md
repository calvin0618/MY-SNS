# 📊 Supabase 데이터베이스 마이그레이션 가이드

## 🔧 Supabase Dashboard에서 SQL 실행하기

### 1단계: Supabase Dashboard 접속
1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택

### 2단계: SQL Editor 열기
1. 왼쪽 사이드바에서 **SQL Editor** 클릭
2. **New query** 버튼 클릭

### 3단계: 마이그레이션 실행 순서

#### ✅ 1번: 기본 스키마 생성
아래 SQL을 복사하여 실행:

```sql
-- 파일: supabase/migrations/20241104_create_sns_schema.sql
-- 전체 내용을 복사하여 실행
```

**⚠️ 중요**: `20241104_create_sns_schema.sql` 파일의 전체 내용을 복사하여 실행하세요.

#### ✅ 2번: Storage 버킷 생성 (선택사항)
이미 `my-sns` 버킷이 있다면 생략 가능합니다.

```sql
-- 파일: supabase/migrations/setup_storage_my-sns.sql
-- 전체 내용을 복사하여 실행
```

### 4단계: 실행 확인

실행 후 다음 테이블들이 생성되었는지 확인:

1. **Table Editor**에서 확인:
   - ✅ `users` 테이블
   - ✅ `posts` 테이블
   - ✅ `likes` 테이블
   - ✅ `comments` 테이블
   - ✅ `follows` 테이블

2. **Storage**에서 확인:
   - ✅ `my-sns` 버킷 (이미 있다면 업데이트됨)

## 📝 마이그레이션 파일 위치

모든 마이그레이션 파일은 GitHub에 업로드되어 있습니다:
- `supabase/migrations/20241104_create_sns_schema.sql` - 메인 스키마
- `supabase/migrations/setup_storage_my-sns.sql` - Storage 설정

## 🚨 주의사항

1. **기존 데이터**: 마이그레이션 SQL은 `IF NOT EXISTS`를 사용하므로 기존 데이터를 보호합니다.
2. **중복 실행**: 같은 마이그레이션을 여러 번 실행해도 안전합니다.
3. **백업**: 프로덕션 환경에서는 마이그레이션 전에 데이터베이스 백업을 권장합니다.

## ✅ 완료 확인

마이그레이션이 성공적으로 완료되면:
- 모든 테이블이 생성되었는지 확인
- Storage 버킷이 생성되었는지 확인
- 개발 서버에서 API 호출 테스트

---

**참고**: Supabase CLI를 사용하려면 다음 명령어로 설치할 수 있습니다:
```bash
npm install -g supabase
```

