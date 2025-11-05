"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { useLanguage } from "@/components/providers/language-provider";

interface LoginRequiredModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string; // 게시물 작성자 이름 (좋아요 시 사용)
}

/**
 * 로그인 팝업 컴포넌트
 * 로그인하지 않은 사용자가 좋아요, 만들기, 프로필, 댓글 작성, 메시지 버튼 클릭 시 표시
 * 
 * 표시 내용:
 * - "가입하거나 로그인하여 "{사용자명}"님의 게시물을 확인해보세요."
 * - "계속하면 MY SNS 이용 약관 및 개인정보처리방침에 동의하게 됩니다."
 * - 가입하기 버튼 (파란색 배경)
 * - 로그인 버튼
 */
export default function LoginRequiredModal({
  open,
  onOpenChange,
  userName,
}: LoginRequiredModalProps) {
  const { t } = useLanguage();
  const displayName = userName || "선택한 이용자";
  const message = userName 
    ? t("loginMessage", { userName })
    : t("loginMessageDefault");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">
            {t("loginRequired")}
          </DialogTitle>
          <DialogDescription className="text-center pt-4 space-y-4">
            <p className="text-sm text-muted-foreground">{message}</p>
            <p className="text-xs text-muted-foreground">
              {t("termsAgreement")}
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          <SignUpButton mode="modal">
            <Button className="w-full bg-[#0095f6] hover:bg-[#1877f2] text-white">
              {t("signUp")}
            </Button>
          </SignUpButton>
          <SignInButton mode="modal">
            <Button variant="outline" className="w-full">
              {t("signIn")}
            </Button>
          </SignInButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

