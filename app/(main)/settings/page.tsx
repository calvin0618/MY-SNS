"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { ArrowLeft, Camera, Save } from "lucide-react";
import { UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * 프로필 편집 페이지
 * Instagram 스타일의 프로필 편집 화면
 */
export default function SettingsPage() {
  const router = useRouter();
  const { user: clerkUser } = useUser();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 폼 데이터
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 프로필 정보 로드
  useEffect(() => {
    const fetchProfile = async () => {
      if (!clerkUser?.id) return;

      try {
        setIsLoading(true);
        console.log("🔵 프로필 정보 로드 시작:", clerkUser.id);
        const response = await fetch(`/api/users/${clerkUser.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "프로필을 불러오는데 실패했습니다.");
        }

        if (!data.profile.is_own_profile) {
          router.push("/");
          return;
        }

        console.log("✅ 프로필 정보 로드 성공:", data.profile);
        setProfile(data.profile);
        setUsername(data.profile.username || "");
        setFullName(data.profile.full_name || "");
        setAvatarUrl(data.profile.avatar_url);
        setAvatarPreview(data.profile.avatar_url);
      } catch (error) {
        console.error("❌ 프로필 정보 로드 실패:", error);
        setError(error instanceof Error ? error.message : "알 수 없는 오류");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [clerkUser?.id, router]);

  // 파일 선택 처리
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 선택할 수 있습니다.");
      return;
    }

    // 파일 크기 검증 (최대 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      alert("파일 크기는 최대 5MB까지 가능합니다.");
      return;
    }

    setSelectedFile(file);

    // 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 프로필 저장
  const handleSave = async () => {
    if (!profile || !clerkUser?.id) return;

    setIsSaving(true);
    setError(null);

    try {
      console.log("🔵 프로필 저장 시작");

      // 프로필 이미지 업로드 (새 파일이 있는 경우)
      let newAvatarUrl = avatarUrl;
      if (selectedFile) {
        console.log("📤 프로필 이미지 업로드 시작");
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadResponse = await fetch("/api/users/upload-avatar", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || "이미지 업로드에 실패했습니다.");
        }

        newAvatarUrl = uploadData.avatar_url;
        console.log("✅ 프로필 이미지 업로드 성공:", newAvatarUrl);
      }

      // 프로필 정보 업데이트
      const updateResponse = await fetch(`/api/users/${clerkUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          full_name: fullName.trim() || null,
          avatar_url: newAvatarUrl,
        }),
      });

      const updateData = await updateResponse.json();

      if (!updateResponse.ok) {
        throw new Error(updateData.error || "프로필 수정에 실패했습니다.");
      }

      console.log("✅ 프로필 저장 성공");
      
      // 프로필 페이지로 이동
      router.push(`/profile/${clerkUser.id}`);
    } catch (error) {
      console.error("❌ 프로필 저장 실패:", error);
      setError(error instanceof Error ? error.message : "프로필 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 프로필 이미지 URL
  const getAvatarUrl = (avatarUrl: string | null, username: string) => {
    if (avatarUrl && avatarUrl.trim() !== "") {
      if (avatarUrl.startsWith("http")) {
        return avatarUrl;
      }
      return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_STORAGE_BUCKET}/${avatarUrl}`;
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-2">
            {error || "프로필을 불러올 수 없습니다."}
          </p>
          <Button onClick={() => router.push("/")} variant="outline">
            홈으로 가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <div className="max-w-[935px] mx-auto px-4 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">프로필 편집</h1>
        </div>
      </div>

      {/* 프로필 편집 폼 */}
      <div className="max-w-[935px] mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* 프로필 이미지 */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200">
              {avatarPreview ? (
                <Image
                  src={avatarPreview.startsWith("data:") ? avatarPreview : getAvatarUrl(avatarPreview, username)}
                  alt={username}
                  fill
                  className="object-cover"
                  sizes="96px"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-300 text-white text-2xl font-semibold">
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button variant="outline" size="sm" asChild>
                <span className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  프로필 사진 변경
                </span>
              </Button>
            </label>
          </div>

          {/* 사용자명 */}
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-foreground">
              사용자명
            </label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="사용자명"
              className="bg-white dark:bg-[#1a1a1a]"
            />
            <p className="text-xs text-muted-foreground">
              사용자명은 최소 1자 이상이어야 합니다.
            </p>
          </div>

          {/* 이름 */}
          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium text-foreground">
              이름
            </label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="이름 (선택사항)"
              className="bg-white dark:bg-[#1a1a1a]"
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
              {error}
            </div>
          )}

          {/* 저장 버튼 */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={isSaving}
            >
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !username.trim()}
              className="bg-[#0095f6] hover:bg-[#1877f2] text-white"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  저장 중...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  저장
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

