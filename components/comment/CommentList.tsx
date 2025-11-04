"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { MoreVertical, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CommentWithUser } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils";

interface CommentListProps {
  comments: CommentWithUser[];
  onDelete?: (commentId: string) => void; // 댓글 삭제 후 콜백
  maxHeight?: string; // 스크롤 영역 최대 높이
  currentUserId?: string; // 현재 사용자의 Supabase user_id (삭제 버튼 표시용)
}

/**
 * CommentList 컴포넌트
 * Instagram 스타일의 댓글 목록
 */
export default function CommentList({
  comments,
  onDelete,
  maxHeight = "400px",
  currentUserId,
}: CommentListProps) {
  const { user: clerkUser } = useUser();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 최신 순 정렬 (created_at DESC)
  const sortedComments = [...comments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // 삭제 버튼 클릭 핸들러
  const handleDeleteClick = (commentId: string) => {
    setSelectedCommentId(commentId);
    setDeleteDialogOpen(true);
  };

  // 삭제 확인
  const handleDeleteConfirm = async () => {
    if (!selectedCommentId) return;

    setIsDeleting(true);
    console.log("🔴 댓글 삭제 시작:", selectedCommentId);

    try {
      const response = await fetch(`/api/comments?comment_id=${selectedCommentId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ 댓글 삭제 실패:", data.error);
        alert(data.error || "댓글 삭제에 실패했습니다.");
        return;
      }

      console.log("✅ 댓글 삭제 성공:", data);

      // 부모 컴포넌트에 삭제 알림
      if (onDelete) {
        onDelete(selectedCommentId);
      }

      // 다이얼로그 닫기
      setDeleteDialogOpen(false);
      setSelectedCommentId(null);
    } catch (error) {
      console.error("❌ 댓글 삭제 에러:", error);
      alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsDeleting(false);
    }
  };

  // 현재 사용자가 댓글 작성자인지 확인
  const isCommentOwner = (commentUserId: string) => {
    if (!currentUserId) return false;
    return commentUserId === currentUserId;
  };

  if (comments.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-[#8e8e8e]">
        댓글이 없습니다.
      </div>
    );
  }

  return (
    <>
      <div
        className="overflow-y-auto px-4"
        style={{ maxHeight }}
      >
        <div className="space-y-4 py-2">
          {sortedComments.map((comment) => {
            const isOwner = isCommentOwner(comment.user_id);
            const avatarUrl =
              comment.user.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user.username}`;

            return (
              <div key={comment.id} className="flex items-start gap-3 group">
                {/* 프로필 이미지 */}
                <Link href={`/profile/${comment.user.id}`}>
                  <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    {comment.user.avatar_url ? (
                      <img
                        src={avatarUrl}
                        alt={comment.user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-300 text-white text-xs font-semibold">
                        {comment.user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </Link>

                {/* 댓글 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <Link
                        href={`/profile/${comment.user.id}`}
                        className="font-semibold text-sm text-[#262626] hover:opacity-70 mr-1"
                      >
                        {comment.user.username}
                      </Link>
                      <span className="text-sm text-[#262626]">
                        {comment.content}
                      </span>
                    </div>

                    {/* 삭제 버튼 (본인만 표시) */}
                    {isOwner && (
                      <button
                        onClick={() => handleDeleteClick(comment.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                        aria-label="댓글 삭제"
                      >
                        <MoreVertical className="w-4 h-4 text-[#8e8e8e]" />
                      </button>
                    )}
                  </div>

                  {/* 시간 표시 */}
                  <div className="mt-1">
                    <span className="text-xs text-[#8e8e8e]">
                      {formatRelativeTime(comment.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>댓글 삭제</DialogTitle>
            <DialogDescription>
              정말 이 댓글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedCommentId(null);
              }}
              disabled={isDeleting}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

