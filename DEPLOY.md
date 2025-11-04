# 🚀 Vercel 배포 가이드

## 배포 전 준비사항

### 1. GitHub 저장소 확인
- ✅ 저장소: https://github.com/calvin0618/MY-SNS.git
- ✅ 브랜치: `main`
- ✅ 코드가 모두 푸시되었는지 확인

### 2. 환경 변수 준비
Vercel에 다음 환경 변수들을 설정해야 합니다:

#### Clerk 환경 변수
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
CLERK_SECRET_KEY=<your-clerk-secret-key>
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

#### Supabase 환경 변수
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
NEXT_PUBLIC_STORAGE_BUCKET=my-sns
```

> ⚠️ **주의**: `SUPABASE_SERVICE_ROLE_KEY`는 관리자 권한이므로 절대 공개하지 마세요!

## Vercel 배포 단계

### 1. Vercel 프로젝트 생성

1. [Vercel Dashboard](https://vercel.com/dashboard)에 접속하여 로그인
2. **"Add New..."** → **"Project"** 클릭
3. **"Import Git Repository"** 선택
4. GitHub 저장소 목록에서 `calvin0618/MY-SNS` 선택
5. **"Import"** 클릭

### 2. 프로젝트 설정

#### 프레임워크 설정
- **Framework Preset**: Next.js (자동 감지됨)
- **Root Directory**: `supabase-boilerplate` (또는 프로젝트 루트)
- **Build Command**: `pnpm build` (자동 설정됨)
- **Output Directory**: `.next` (자동 설정됨)
- **Install Command**: `pnpm install` (자동 설정됨)
- **Node.js Version**: 20.x (`.nvmrc` 및 `package.json`의 `engines` 필드에서 자동 감지됨)

> ⚠️ **중요**: Vercel 프로젝트 설정에서 Node.js 버전을 명시적으로 설정해야 합니다:
> 1. Vercel Dashboard → 프로젝트 선택 → **Settings**
> 2. **General** → **Node.js Version** 섹션
> 3. **"Override"** 선택 → **20.x** 선택
> 4. 또는 `.nvmrc` 파일이 있으면 자동으로 감지됩니다

#### 환경 변수 설정
1. **"Environment Variables"** 섹션으로 스크롤
2. 위에서 준비한 환경 변수들을 하나씩 추가:
   - **Name**: 환경 변수 이름 (예: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`)
   - **Value**: 환경 변수 값
   - **Environment**: Production, Preview, Development 모두 선택
3. 모든 환경 변수를 추가한 후 **"Save"** 클릭

### 3. Clerk 리다이렉트 URL 설정

Vercel 배포 후 Clerk Dashboard에서 리다이렉트 URL을 추가해야 합니다:

1. [Clerk Dashboard](https://dashboard.clerk.com/) → 프로젝트 선택
2. **"Settings"** → **"Paths"** 메뉴
3. **"Redirect URLs"** 섹션에 다음 추가:
   - `https://your-project.vercel.app/*` (프로덕션 URL)
   - `https://your-project-git-main.vercel.app/*` (프리뷰 URL)
   - `https://your-project-*.vercel.app/*` (모든 프리뷰 브랜치)

### 4. 배포 실행

1. **"Deploy"** 버튼 클릭
2. 배포 진행 상황 확인 (약 2-3분 소요)
3. 배포 완료 후 **"Visit"** 버튼으로 사이트 확인

## 배포 후 확인 사항

### 1. 기본 기능 테스트
- ✅ 홈페이지 로딩 확인
- ✅ 로그인/회원가입 기능 테스트
- ✅ 게시물 작성 기능 테스트
- ✅ 좋아요 기능 테스트

### 2. 환경 변수 확인
배포된 사이트에서 다음을 확인:
- Clerk 인증이 정상 작동하는지
- Supabase 연결이 정상인지
- 이미지 업로드가 정상 작동하는지

### 3. 에러 로그 확인
Vercel Dashboard → **"Functions"** → **"Logs"**에서 에러 확인

## 문제 해결

### 빌드 실패
- **원인**: 환경 변수 누락 또는 잘못된 설정
- **해결**: Vercel Dashboard에서 환경 변수 재확인

### 인증 오류
- **원인**: Clerk 리다이렉트 URL 미설정
- **해결**: Clerk Dashboard에서 Vercel URL 추가

### 데이터베이스 연결 오류
- **원인**: Supabase 환경 변수 오류
- **해결**: Supabase URL과 키 확인

## 추가 리소스
- [Vercel 문서](https://vercel.com/docs)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)
- [Clerk 배포 가이드](https://clerk.com/docs/deployments/overview)

