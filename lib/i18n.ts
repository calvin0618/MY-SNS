/**
 * i18n 설정 및 타입 정의
 */

export type Language = "ko" | "en" | "ja" | "zh";

export const languages: { code: Language; name: string; nativeName: string }[] = [
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
];

export const defaultLanguage: Language = "ko";

// 언어별 번역 파일
export const translations = {
  ko: {
    // 공통
    home: "홈",
    search: "검색",
    create: "만들기",
    profile: "프로필",
    notifications: "알림",
    messages: "메시지",
    logout: "로그아웃",
    login: "로그인",
    signUp: "가입하기",
    signIn: "로그인",
    
    // 게시물
    post: "게시물",
    posts: "게시물",
    like: "좋아요",
    likes: "좋아요",
    comment: "댓글",
    comments: "댓글",
    likeCount: "좋아요 {count}개",
    commentCount: "댓글 {count}개",
    writeComment: "댓글 달기...",
    postComment: "게시",
    delete: "삭제",
    deletePost: "게시물 삭제",
    deleteComment: "댓글 삭제",
    
    // 프로필
    following: "팔로잉",
    follow: "팔로우",
    followers: "팔로워",
    followingCount: "팔로잉 {count}",
    followersCount: "팔로워 {count}",
    postsCount: "게시물 {count}",
    
    // 로그인 팝업
    loginRequired: "로그인이 필요합니다",
    loginMessage: '가입하거나 로그인하여 "{userName}"님의 게시물을 확인해보세요.',
    loginMessageDefault: '가입하거나 로그인하여 "선택한 이용자"님의 게시물을 확인해보세요.',
    termsAgreement: "계속하면 MY SNS 이용 약관 및 개인정보처리방침에 동의하게 됩니다.",
    
    // 에러 메시지
    error: "오류",
    unauthorized: "인증이 필요합니다",
    selfFollowError: "자신을 팔로워 할 수 없습니다",
    
    // 기타
    loading: "로딩 중...",
    close: "닫기",
    save: "저장",
    cancel: "취소",
    edit: "수정",
    share: "공유",
    more: "더보기",
  },
  en: {
    // Common
    home: "Home",
    search: "Search",
    create: "Create",
    profile: "Profile",
    notifications: "Notifications",
    messages: "Messages",
    logout: "Logout",
    login: "Login",
    signUp: "Sign Up",
    signIn: "Sign In",
    
    // Posts
    post: "Post",
    posts: "Posts",
    like: "Like",
    likes: "Likes",
    comment: "Comment",
    comments: "Comments",
    likeCount: "{count} likes",
    commentCount: "{count} comments",
    writeComment: "Add a comment...",
    postComment: "Post",
    delete: "Delete",
    deletePost: "Delete Post",
    deleteComment: "Delete Comment",
    
    // Profile
    following: "Following",
    follow: "Follow",
    followers: "Followers",
    followingCount: "{count} following",
    followersCount: "{count} followers",
    postsCount: "{count} posts",
    
    // Login Popup
    loginRequired: "Login Required",
    loginMessage: 'Sign up or log in to view "{userName}"\'s posts.',
    loginMessageDefault: 'Sign up or log in to view "selected user"\'s posts.',
    termsAgreement: "By continuing, you agree to MY SNS Terms of Service and Privacy Policy.",
    
    // Error Messages
    error: "Error",
    unauthorized: "Authorization required",
    selfFollowError: "You cannot follow yourself",
    
    // Others
    loading: "Loading...",
    close: "Close",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    share: "Share",
    more: "More",
  },
  ja: {
    // 共通
    home: "ホーム",
    search: "検索",
    create: "作成",
    profile: "プロフィール",
    notifications: "通知",
    messages: "メッセージ",
    logout: "ログアウト",
    login: "ログイン",
    signUp: "登録",
    signIn: "ログイン",
    
    // 投稿
    post: "投稿",
    posts: "投稿",
    like: "いいね",
    likes: "いいね",
    comment: "コメント",
    comments: "コメント",
    likeCount: "いいね {count}件",
    commentCount: "コメント {count}件",
    writeComment: "コメントを追加...",
    postComment: "投稿",
    delete: "削除",
    deletePost: "投稿を削除",
    deleteComment: "コメントを削除",
    
    // プロフィール
    following: "フォロー中",
    follow: "フォロー",
    followers: "フォロワー",
    followingCount: "フォロー中 {count}",
    followersCount: "フォロワー {count}",
    postsCount: "投稿 {count}",
    
    // ログインポップアップ
    loginRequired: "ログインが必要です",
    loginMessage: '「{userName}」さんの投稿を表示するには、登録またはログインしてください。',
    loginMessageDefault: '「選択したユーザー」さんの投稿を表示するには、登録またはログインしてください。',
    termsAgreement: "続行すると、MY SNS利用規約およびプライバシーポリシーに同意したことになります。",
    
    // エラーメッセージ
    error: "エラー",
    unauthorized: "認証が必要です",
    selfFollowError: "自分をフォローすることはできません",
    
    // その他
    loading: "読み込み中...",
    close: "閉じる",
    save: "保存",
    cancel: "キャンセル",
    edit: "編集",
    share: "共有",
    more: "もっと見る",
  },
  zh: {
    // 通用
    home: "首页",
    search: "搜索",
    create: "创建",
    profile: "个人资料",
    notifications: "通知",
    messages: "消息",
    logout: "登出",
    login: "登录",
    signUp: "注册",
    signIn: "登录",
    
    // 帖子
    post: "帖子",
    posts: "帖子",
    like: "点赞",
    likes: "点赞",
    comment: "评论",
    comments: "评论",
    likeCount: "{count} 个赞",
    commentCount: "{count} 条评论",
    writeComment: "添加评论...",
    postComment: "发布",
    delete: "删除",
    deletePost: "删除帖子",
    deleteComment: "删除评论",
    
    // 个人资料
    following: "正在关注",
    follow: "关注",
    followers: "粉丝",
    followingCount: "关注 {count}",
    followersCount: "粉丝 {count}",
    postsCount: "帖子 {count}",
    
    // 登录弹窗
    loginRequired: "需要登录",
    loginMessage: '注册或登录以查看"{userName}"的帖子。',
    loginMessageDefault: '注册或登录以查看"所选用户"的帖子。',
    termsAgreement: "继续即表示您同意 MY SNS 服务条款和隐私政策。",
    
    // 错误消息
    error: "错误",
    unauthorized: "需要授权",
    selfFollowError: "您不能关注自己",
    
    // 其他
    loading: "加载中...",
    close: "关闭",
    save: "保存",
    cancel: "取消",
    edit: "编辑",
    share: "分享",
    more: "更多",
  },
} as const;

export type TranslationKey = keyof typeof translations.ko;

export function getTranslation(lang: Language, key: TranslationKey, params?: Record<string, string | number>): string {
  const translation = translations[lang][key] || translations[defaultLanguage][key];
  
  if (!translation) {
    console.warn(`Translation key "${key}" not found`);
    return key;
  }
  
  // 파라미터 치환
  if (params) {
    return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
      return str.replace(`{${paramKey}}`, String(paramValue));
    }, translation);
  }
  
  return translation;
}

