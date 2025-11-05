"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated?: () => void; // 게시물 생성 완료 후 콜백
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_CAPTION_LENGTH = 2200;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/**
 * CreatePostModal 컴포넌트
 * 게시물 작성 모달 (Instagram 스타일)
 */
export default function CreatePostModal({
  open,
  onOpenChange,
  onPostCreated,
}: CreatePostModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 디버깅: 상태 변화 추적
  useEffect(() => {
    console.log("📊 CreatePostModal 상태:", {
      hasSelectedFile: !!selectedFile,
      hasPreviewUrl: !!previewUrl,
      previewUrlLength: previewUrl?.length || 0,
      error,
      isUploading,
    });
  }, [selectedFile, previewUrl, error, isUploading]);

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("🔵 파일 선택 이벤트 발생");
    const file = e.target.files?.[0];
    
    if (!file) {
      console.warn("⚠️ 파일이 선택되지 않았습니다.");
      return;
    }

    console.log("📁 선택된 파일:", {
      name: file.name,
      size: file.size,
      type: file.type,
      sizeMB: (file.size / 1024 / 1024).toFixed(2),
    });

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      const errorMsg = `이미지 파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB 이하여야 합니다.`;
      console.error("❌ 파일 크기 초과:", errorMsg);
      setError(errorMsg);
      return;
    }

    // 파일 형식 검증
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      const errorMsg = "지원하지 않는 이미지 형식입니다. (jpg, png, webp만 가능)";
      console.error("❌ 파일 형식 오류:", {
        fileType: file.type,
        allowedTypes: ALLOWED_IMAGE_TYPES,
      });
      setError(errorMsg);
      return;
    }

    console.log("✅ 파일 검증 통과");
    setSelectedFile(file);
    setError(null);

    // 미리보기 URL 생성
    console.log("🖼️ 미리보기 URL 생성 시작");
    const reader = new FileReader();
    
    reader.onloadend = () => {
      console.log("✅ FileReader onloadend 완료");
      const result = reader.result as string;
      if (result) {
        console.log("✅ 미리보기 URL 설정:", result.substring(0, 50) + "...");
        setPreviewUrl(result);
      } else {
        console.error("❌ FileReader 결과가 없습니다.");
        setError("이미지 미리보기를 생성할 수 없습니다.");
      }
    };

    reader.onerror = (error) => {
      console.error("❌ FileReader 에러:", error);
      setError("이미지 파일을 읽을 수 없습니다.");
    };

    reader.readAsDataURL(file);
    console.log("📖 FileReader.readAsDataURL 호출됨");
  };

  // 파일 선택 버튼 클릭
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  // 이미지 제거
  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 게시물 작성
  const handleSubmit = async () => {
    if (!selectedFile) {
      setError("이미지를 선택해주세요.");
      return;
    }

    // 캡션 길이 검증
    if (caption.length > MAX_CAPTION_LENGTH) {
      setError(`캡션은 최대 ${MAX_CAPTION_LENGTH}자까지 입력 가능합니다.`);
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      console.log("🔵 게시물 작성 시작");

      // FormData 생성
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("caption", caption);

      // 업로드 진행률 시뮬레이션 (실제로는 XMLHttpRequest를 사용해야 하지만, fetch로 간단히 처리)
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
          console.log(`📤 업로드 진행률: ${percentComplete.toFixed(1)}%`);
        }
      });

      const uploadPromise = new Promise<Response>((resolve, reject) => {
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(new Response(xhr.responseText, { status: xhr.status }));
          } else {
            // 에러 응답 파싱
            let errorMessage = "게시물 작성에 실패했습니다.";
            let errorDetails = "";
            
            try {
              const errorData = xhr.responseText ? JSON.parse(xhr.responseText) : {};
              errorMessage = errorData.error || errorMessage;
              errorDetails = errorData.details || errorData.message || "";
              
              console.error("❌ 게시물 작성 API 에러:", {
                status: xhr.status,
                statusText: xhr.statusText,
                error: errorMessage,
                details: errorDetails,
                fullResponse: errorData,
              });
            } catch (parseError) {
              console.error("❌ 에러 응답 파싱 실패:", {
                responseText: xhr.responseText,
                parseError,
              });
              errorMessage = xhr.responseText || errorMessage;
            }
            
            const fullError = errorDetails 
              ? `${errorMessage}: ${errorDetails}`
              : errorMessage;
            
            reject(new Error(fullError));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("네트워크 오류가 발생했습니다. 인터넷 연결을 확인하세요."));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("업로드가 취소되었습니다."));
        });

        xhr.open("POST", "/api/posts");
        xhr.send(formData);
      });

      const response = await uploadPromise;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "게시물 작성에 실패했습니다.");
      }

      console.log("✅ 게시물 작성 성공:", data);

      // 성공 처리
      setUploadProgress(100);
      
      // 상태 초기화
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption("");
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // 모달 닫기
      onOpenChange(false);

      // 콜백 호출 (부모 컴포넌트에서 피드 새로고침 등)
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error) {
      console.error("❌ 게시물 작성 에러:", error);
      setError(error instanceof Error ? error.message : "게시물 작성에 실패했습니다.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // 모달 닫기 핸들러
  const handleClose = () => {
    if (isUploading) return; // 업로드 중에는 닫기 불가
    
    // 상태 초기화
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption("");
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white">
        <DialogHeader className="px-6 py-4 border-b border-[#dbdbdb] bg-white">
          <DialogTitle className="text-center text-base font-semibold text-[#262626]">
            새 게시물 만들기
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col">
          {/* 에러 메시지 표시 (파일 선택 영역 위에 표시) */}
          {error && !previewUrl && (
            <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
              {error}
            </div>
          )}

          {/* 이미지 업로드 영역 */}
          {!previewUrl ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 min-h-[400px]">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <Upload className="w-12 h-12 text-[#8e8e8e] mb-4" />
              <p className="text-lg font-semibold text-[#262626] mb-2">
                사진을 여기로 끌어다 놓으세요
              </p>
              <Button
                onClick={handleSelectFile}
                className="mt-4 bg-[#0095f6] hover:bg-[#1877f2] text-white"
              >
                컴퓨터에서 선택
              </Button>
              <p className="text-xs text-[#8e8e8e] mt-4">
                JPG, PNG, WEBP 파일 (최대 5MB)
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* 이미지 미리보기 */}
              <div className="relative aspect-square bg-gray-100">
                <Image
                  src={previewUrl}
                  alt="미리보기"
                  fill
                  className="object-contain"
                  sizes="600px"
                  unoptimized
                  priority
                />
                
                {/* 제거 버튼 */}
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  aria-label="이미지 제거"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* 업로드 진행률 표시 */}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="bg-card rounded-lg p-6 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0095f6]" />
                      <p className="text-sm font-semibold text-card-foreground mb-1">
                        업로드 중...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {uploadProgress.toFixed(0)}%
                      </p>
                      <div className="mt-2 w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0095f6] transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 캡션 입력 영역 */}
              <div className="p-4 border-t border-border">
                <div className="flex items-start gap-3">
                  <Textarea
                    placeholder="캡션 작성..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    maxLength={MAX_CAPTION_LENGTH}
                    className={cn(
                      "min-h-[100px] resize-none border-0 focus:ring-0",
                      "text-sm text-[#262626] placeholder:text-[#8e8e8e]"
                    )}
                    disabled={isUploading}
                  />
                </div>
                
                {/* 글자 수 표시 */}
                <div className="flex justify-end mt-2">
                  <span
                    className={cn(
                      "text-xs",
                      caption.length > MAX_CAPTION_LENGTH * 0.9
                        ? "text-[#ed4956]"
                        : "text-[#8e8e8e]"
                    )}
                  >
                    {caption.length} / {MAX_CAPTION_LENGTH}
                  </span>
                </div>

                {/* 에러 메시지 */}
                {error && (
                  <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                    {error}
                  </div>
                )}

                {/* 게시 버튼 */}
                <Button
                  onClick={handleSubmit}
                  disabled={isUploading || !selectedFile}
                  className={cn(
                    "w-full mt-4",
                    isUploading || !selectedFile
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-[#0095f6] hover:bg-[#1877f2] text-white"
                  )}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      게시 중...
                    </>
                  ) : (
                    "게시"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

