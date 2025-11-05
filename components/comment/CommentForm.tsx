"use client";

import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommentFormProps {
  postId: string;
  onSubmit?: (content: string) => Promise<void>; // 댓글 작성 후 콜백
  placeholder?: string;
  autoFocus?: boolean;
}

const MAX_COMMENT_LENGTH = 1000;

/**
 * CommentForm 컴포넌트
 * Instagram 스타일의 댓글 작성 폼
 */
export default function CommentForm({
  postId,
  onSubmit,
  placeholder = "댓글 달기...",
  autoFocus = false,
}: CommentFormProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 자동 포커스
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Enter 키 제출 (Shift+Enter는 줄바꿈)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (content.trim() && !isSubmitting) {
        handleSubmit();
      }
    }
  };

  // 댓글 작성
  const handleSubmit = async () => {
    const trimmedContent = content.trim();

    // 빈 댓글 체크
    if (!trimmedContent) {
      return;
    }

    // 길이 제한 체크
    if (trimmedContent.length > MAX_COMMENT_LENGTH) {
      alert(`댓글은 최대 ${MAX_COMMENT_LENGTH}자까지 입력 가능합니다.`);
      return;
    }

    setIsSubmitting(true);
    console.log("🔵 댓글 작성 시작:", { postId, contentLength: trimmedContent.length });

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post_id: postId,
          content: trimmedContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ 댓글 작성 실패:", data.error);
        alert(data.error || "댓글 작성에 실패했습니다.");
        return;
      }

      console.log("✅ 댓글 작성 성공:", data);

      // 입력 필드 초기화
      setContent("");

      // 포커스 유지
      if (textareaRef.current) {
        textareaRef.current.focus();
      }

      // 부모 컴포넌트에 알림
      if (onSubmit) {
        await onSubmit(trimmedContent);
      }
    } catch (error) {
      console.error("❌ 댓글 작성 에러:", error);
      alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-t border-[#dbdbdb] px-4 py-3">
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={MAX_COMMENT_LENGTH}
          disabled={isSubmitting}
          className={cn(
            "flex-1 resize-none border-0 focus:ring-0",
            "text-sm text-foreground placeholder:text-muted-foreground",
            "min-h-[40px] max-h-[100px]",
            "bg-transparent"
          )}
          rows={1}
        />

        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting || content.length > MAX_COMMENT_LENGTH}
          className={cn(
            "px-4 py-2 h-auto",
            "text-sm font-semibold",
            !content.trim() || content.length > MAX_COMMENT_LENGTH || isSubmitting
              ? "text-[#0095f6]/40 cursor-not-allowed"
              : "text-[#0095f6] hover:text-[#1877f2]"
          )}
          variant="ghost"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "게시"
          )}
        </Button>
      </div>

      {/* 글자 수 표시 (길이 제한에 가까울 때만) */}
      {content.length > MAX_COMMENT_LENGTH * 0.9 && (
        <div className="mt-1 flex justify-end">
          <span
            className={cn(
              "text-xs",
              content.length > MAX_COMMENT_LENGTH
                ? "text-[#ed4956]"
                : "text-muted-foreground"
            )}
          >
            {content.length} / {MAX_COMMENT_LENGTH}
          </span>
        </div>
      )}
    </div>
  );
}

