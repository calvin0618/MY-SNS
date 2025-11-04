# 반응형 레이아웃 테스트 가이드

## 브레이크포인트

PRD 요구사항에 따른 브레이크포인트:

- **Mobile**: < 768px
- **Tablet**: 768px ~ 1023px
- **Desktop**: ≥ 1024px

Tailwind CSS 클래스 매핑:
- `md:` = 768px 이상
- `lg:` = 1024px 이상

## 레이아웃 구성 요소

### 1. Sidebar (Desktop/Tablet)
- **파일**: `components/layout/Sidebar.tsx`
- **Desktop (≥1024px)**:
  - 너비: 244px
  - 아이콘 + 텍스트 표시
  - 로고 영역 표시
- **Tablet (768px~1023px)**:
  - 너비: 72px
  - 아이콘만 표시
  - 로고 영역 숨김
- **Mobile (<768px)**:
  - 숨김 (`hidden md:flex`)

### 2. Header (Mobile)
- **파일**: `components/layout/Header.tsx`
- **Mobile (<768px)**:
  - 높이: 60px
  - 고정 위치 (상단)
  - 로고 + 알림/DM/프로필 아이콘
- **Desktop/Tablet**:
  - 숨김 (`md:hidden`)

### 3. Bottom Navigation (Mobile)
- **파일**: `components/layout/BottomNav.tsx`
- **Mobile (<768px)**:
  - 높이: 50px
  - 고정 위치 (하단)
  - 5개 아이콘: 홈, 검색, 만들기, 좋아요, 프로필
- **Desktop/Tablet**:
  - 숨김 (`md:hidden`)

### 4. Main Layout
- **파일**: `app/(main)/layout.tsx`
- **메인 콘텐츠 영역**:
  - 최대 너비: 630px (PRD 요구사항)
  - 중앙 정렬
  - 배경: #fafafa
- **반응형 공간 확보**:
  - Desktop/Tablet: `md:ml-[72px] lg:ml-[244px]` (Sidebar 공간)
  - Mobile: `pt-[60px]` (Header 공간), `pb-[50px]` (Bottom Nav 공간)

## 테스트 체크리스트

### Mobile (< 768px)
- [ ] Sidebar 숨김 확인
- [ ] Header 표시 확인 (높이 60px)
- [ ] Bottom Nav 표시 확인 (높이 50px)
- [ ] 메인 콘텐츠가 Header/Bottom Nav 공간 확보 확인
- [ ] 전체 너비로 콘텐츠 표시 확인

### Tablet (768px ~ 1023px)
- [ ] Sidebar 표시 확인 (너비 72px, 아이콘만)
- [ ] Header 숨김 확인
- [ ] Bottom Nav 숨김 확인
- [ ] 메인 콘텐츠가 Sidebar 공간 확보 확인 (ml-[72px])
- [ ] PostCard 최대 너비 630px 확인

### Desktop (≥ 1024px)
- [ ] Sidebar 표시 확인 (너비 244px, 아이콘 + 텍스트)
- [ ] 로고 영역 표시 확인
- [ ] Header 숨김 확인
- [ ] Bottom Nav 숨김 확인
- [ ] 메인 콘텐츠가 Sidebar 공간 확보 확인 (ml-[244px])
- [ ] PostCard 최대 너비 630px 확인

## 브라우저 개발자 도구 테스트

### Chrome DevTools
1. F12 또는 우클릭 → 검사
2. 디바이스 툴바 토글 (Ctrl+Shift+M)
3. 반응형 모드 선택
4. 다음 해상도로 테스트:
   - Mobile: 375px (iPhone SE), 414px (iPhone Pro Max)
   - Tablet: 768px (iPad), 1024px (iPad Pro)
   - Desktop: 1280px, 1920px

### 테스트 시나리오
1. 브라우저 크기를 조절하면서 레이아웃 변화 확인
2. 각 브레이크포인트에서 컴포넌트 표시/숨김 확인
3. 메인 콘텐츠 영역 공간 확보 확인
4. 네비게이션 클릭 동작 확인
5. Active 상태 표시 확인

## 예상 동작

### Mobile (< 768px)
```
┌──────────────────────────┐
│ [Header - 60px]          │
├──────────────────────────┤
│                          │
│   [메인 콘텐츠]            │
│   (전체 너비)             │
│                          │
├──────────────────────────┤
│ [Bottom Nav - 50px]      │
└──────────────────────────┘
```

### Tablet (768px ~ 1023px)
```
┌──────┬────────────────────┐
│ 🏠   │                    │
│ 🔍   │   [메인 콘텐츠]      │
│ ➕   │   (최대 630px)      │
│ 👤   │                    │
│[72px]│                    │
└──────┴────────────────────┘
```

### Desktop (≥ 1024px)
```
┌──────────┬─────────────────┐
│ Instagram│                 │
│          │                 │
│ 🏠 홈    │   [메인 콘텐츠]  │
│ 🔍 검색  │   (최대 630px)  │
│ ➕ 만들기│                 │
│ 👤 프로필│                 │
│[244px]   │                 │
└──────────┴─────────────────┘
```

## 확인 사항

- ✅ 모든 컴포넌트가 올바른 브레이크포인트에서 표시/숨김
- ✅ 메인 콘텐츠 영역이 네비게이션 공간을 올바르게 확보
- ✅ 레이아웃이 깨지지 않고 부드럽게 전환
- ✅ Active 상태가 경로에 따라 올바르게 표시
- ✅ 모든 링크가 정상 작동

