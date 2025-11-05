/**
 * SNS 프로젝트 TypeScript 타입 정의
 * 데이터베이스 스키마와 일치하는 타입 정의
 * 작성일: 2025-11-04
 */

// ============================================
// User 타입
// ============================================

/**
 * 사용자 정보 타입
 * Supabase users 테이블과 일치
 */
export interface User {
  id: string; // UUID
  clerk_id: string; // Clerk User ID (UNIQUE)
  username: string; // 사용자명 (UNIQUE)
  full_name: string | null; // 전체 이름
  bio: string | null; // 소개글
  avatar_url: string | null; // 프로필 이미지 URL
  created_at: string; // ISO 8601 형식 (TIMESTAMP WITH TIME ZONE)
  updated_at: string; // ISO 8601 형식 (TIMESTAMP WITH TIME ZONE)
}

/**
 * 사용자 생성 시 사용하는 타입 (id, created_at, updated_at 제외)
 */
export interface CreateUserInput {
  clerk_id: string;
  username: string;
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
}

/**
 * 사용자 업데이트 시 사용하는 타입
 */
export interface UpdateUserInput {
  username?: string;
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
}

// ============================================
// Post 타입
// ============================================

/**
 * 게시물 정보 타입
 * Supabase posts 테이블과 일치
 */
export interface Post {
  id: string; // UUID
  user_id: string; // UUID (FK → users.id)
  image_url: string; // 이미지 URL (Supabase Storage 경로)
  caption: string | null; // 캡션 (최대 2,200자)
  created_at: string; // ISO 8601 형식 (TIMESTAMP WITH TIME ZONE)
  updated_at: string; // ISO 8601 형식 (TIMESTAMP WITH TIME ZONE)
}

/**
 * 게시물 생성 시 사용하는 타입 (id, created_at, updated_at 제외)
 */
export interface CreatePostInput {
  user_id: string;
  image_url: string;
  caption?: string | null;
}

/**
 * 게시물 업데이트 시 사용하는 타입
 */
export interface UpdatePostInput {
  caption?: string | null;
}

/**
 * 게시물과 사용자 정보를 함께 포함한 타입 (API 응답용)
 */
export interface PostWithUser extends Post {
  user: User;
  likes_count?: number; // 좋아요 수
  comments_count?: number; // 댓글 수
  is_liked?: boolean; // 현재 사용자가 좋아요 했는지
}

// ============================================
// Like 타입
// ============================================

/**
 * 좋아요 정보 타입
 * Supabase likes 테이블과 일치
 */
export interface Like {
  id: string; // UUID
  post_id: string; // UUID (FK → posts.id)
  user_id: string; // UUID (FK → users.id)
  created_at: string; // ISO 8601 형식 (TIMESTAMP WITH TIME ZONE)
}

/**
 * 좋아요 생성 시 사용하는 타입 (id, created_at 제외)
 */
export interface CreateLikeInput {
  post_id: string;
  user_id: string;
}

/**
 * 좋아요와 사용자 정보를 함께 포함한 타입
 */
export interface LikeWithUser extends Like {
  user: User;
}

// ============================================
// Comment 타입
// ============================================

/**
 * 댓글 정보 타입
 * Supabase comments 테이블과 일치
 */
export interface Comment {
  id: string; // UUID
  post_id: string; // UUID (FK → posts.id)
  user_id: string; // UUID (FK → users.id)
  content: string; // 댓글 내용
  created_at: string; // ISO 8601 형식 (TIMESTAMP WITH TIME ZONE)
  updated_at: string; // ISO 8601 형식 (TIMESTAMP WITH TIME ZONE)
}

/**
 * 댓글 생성 시 사용하는 타입 (id, created_at, updated_at 제외)
 */
export interface CreateCommentInput {
  post_id: string;
  user_id: string;
  content: string;
}

/**
 * 댓글 업데이트 시 사용하는 타입
 */
export interface UpdateCommentInput {
  content: string;
}

/**
 * 댓글과 사용자 정보를 함께 포함한 타입 (API 응답용)
 */
export interface CommentWithUser extends Comment {
  user: User;
}

// ============================================
// Follow 타입
// ============================================

/**
 * 팔로우 정보 타입
 * Supabase follows 테이블과 일치
 */
export interface Follow {
  id: string; // UUID
  follower_id: string; // UUID (FK → users.id) - 팔로우하는 사용자
  following_id: string; // UUID (FK → users.id) - 팔로우받는 사용자
  created_at: string; // ISO 8601 형식 (TIMESTAMP WITH TIME ZONE)
}

/**
 * 팔로우 생성 시 사용하는 타입 (id, created_at 제외)
 */
export interface CreateFollowInput {
  follower_id: string;
  following_id: string;
}

/**
 * 팔로우 정보와 사용자 정보를 함께 포함한 타입
 */
export interface FollowWithUser extends Follow {
  follower: User; // 팔로우하는 사용자 정보
  following: User; // 팔로우받는 사용자 정보
}

// ============================================
// 통합 타입 (UI 컴포넌트용)
// ============================================

/**
 * 프로필 페이지에서 사용하는 사용자 정보 타입
 * 게시물 수, 팔로워 수, 팔로잉 수 포함
 */
export interface UserProfile extends User {
  posts_count: number; // 게시물 수
  followers_count: number; // 팔로워 수
  following_count: number; // 팔로잉 수
  is_following?: boolean; // 현재 사용자가 팔로우 중인지
  is_own_profile?: boolean; // 본인 프로필인지
}

/**
 * 게시물 목록 조회 시 사용하는 타입
 * 페이지네이션 정보 포함
 */
export interface PostsResponse {
  posts: PostWithUser[];
  total_count: number; // 전체 게시물 수
  has_more: boolean; // 더 불러올 게시물이 있는지
}

/**
 * 댓글 목록 조회 시 사용하는 타입
 */
export interface CommentsResponse {
  comments: CommentWithUser[];
  total_count: number; // 전체 댓글 수
}

// ============================================
// 유틸리티 타입
// ============================================

/**
 * API 응답 래퍼 타입
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 페이지네이션 파라미터
 */
export interface PaginationParams {
  limit?: number; // 페이지당 항목 수 (기본값: 10)
  offset?: number; // 건너뛸 항목 수 (기본값: 0)
}

/**
 * 정렬 파라미터
 */
export interface SortParams {
  column: string; // 정렬할 컬럼명
  order: 'asc' | 'desc'; // 정렬 방향
}

// ============================================
// Conversation 타입
// ============================================

/**
 * 대화방 정보 타입
 * Supabase conversations 테이블과 일치
 */
export interface Conversation {
  id: string; // UUID
  user1_id: string; // UUID (FK → users.id)
  user2_id: string; // UUID (FK → users.id)
  last_message_at: string; // ISO 8601 형식 (TIMESTAMP WITH TIME ZONE)
  created_at: string; // ISO 8601 형식 (TIMESTAMP WITH TIME ZONE)
  updated_at: string; // ISO 8601 형식 (TIMESTAMP WITH TIME ZONE)
}

/**
 * 대화방 생성 시 사용하는 타입
 */
export interface CreateConversationInput {
  user1_id: string;
  user2_id: string;
}

/**
 * 대화방과 사용자 정보를 함께 포함한 타입 (API 응답용)
 */
export interface ConversationWithUser extends Conversation {
  otherUser: User; // 대화 상대방
  lastMessage: (Message & { isFromMe: boolean }) | null; // 마지막 메시지 (isFromMe 포함)
  unreadCount: number; // 읽지 않은 메시지 수
}

// ============================================
// Message 타입
// ============================================

/**
 * 메시지 정보 타입
 * Supabase messages 테이블과 일치
 */
export interface Message {
  id: string; // UUID
  conversation_id: string; // UUID (FK → conversations.id)
  sender_id: string; // UUID (FK → users.id)
  content: string; // 메시지 내용
  is_read: boolean; // 읽음 여부
  created_at: string; // ISO 8601 형식 (TIMESTAMP WITH TIME ZONE)
  updated_at: string; // ISO 8601 형식 (TIMESTAMP WITH TIME ZONE)
}

/**
 * 메시지 생성 시 사용하는 타입 (id, created_at, updated_at 제외)
 */
export interface CreateMessageInput {
  conversation_id: string;
  sender_id: string;
  content: string;
}

/**
 * 메시지와 사용자 정보를 함께 포함한 타입 (API 응답용)
 */
export interface MessageWithUser extends Message {
  sender: User; // 발신자 정보
  isFromMe: boolean; // 현재 사용자가 보낸 메시지인지
}

