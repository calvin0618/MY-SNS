"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";
import { Button } from "@/components/ui/button";
import {
  LuUpload,
  LuTrash2,
  LuDownload,
  LuFile,
  LuTriangleAlert,
} from "react-icons/lu";
import Link from "next/link";

// Supabase Storage FileObject 타입 정의
interface FileObject {
  id: string;
  name: string;
  bucket_id: string;
  owner?: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  metadata?: Record<string, any>;
}

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "uploads";

export default function StorageTestPage() {
  const { user, isLoaded } = useUser();
  const supabase = useClerkSupabaseClient();
  const [files, setFiles] = useState<FileObject[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 이미지 파일 검증 상수
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

  // 파일 목록 가져오기
  const fetchFiles = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // PRD 요구사항: posts/{userId}/ 경로에서 파일 조회
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(`posts/${user.id}`, {
          limit: 100,
          offset: 0,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) {
        // 버킷이 없는 경우 명확한 에러 메시지
        if (error.message.includes("Bucket not found") || error.message.includes("not found")) {
          throw new Error(
            `Storage 버킷 "${STORAGE_BUCKET}"이(가) 생성되지 않았습니다.\n\n` +
            `Supabase Dashboard에서 버킷을 생성하거나, SQL Editor에서 다음 마이그레이션을 실행하세요:\n` +
            `supabase/migrations/setup_storage.sql`
          );
        }
        throw error;
      }
      setFiles(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "파일 목록을 가져오는데 실패했습니다.";
      setError(errorMessage);
      console.error("Error fetching files:", err);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (isLoaded && user) {
      fetchFiles();
    }
  }, [user, isLoaded, fetchFiles]);

  // 이미지 파일 선택 및 검증
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      setSelectedFile(null);
      setPreviewImage(null);
      return;
    }

    const file = event.target.files[0];
    
    // 파일 타입 검증
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError(`지원하지 않는 파일 형식입니다. 허용된 형식: ${ALLOWED_EXTENSIONS.join(', ').toUpperCase()}`);
      event.target.value = "";
      setSelectedFile(null);
      setPreviewImage(null);
      return;
    }

    // 파일 크기 검증 (5MB)
    if (file.size > MAX_FILE_SIZE) {
      setError(`파일 크기가 너무 큽니다. 최대 크기: ${formatFileSize(MAX_FILE_SIZE)}`);
      event.target.value = "";
      setSelectedFile(null);
      setPreviewImage(null);
      return;
    }

    // 이미지 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);

    setSelectedFile(file);
    setError(null);
  };

  // 이미지 업로드 (PRD 요구사항에 맞춘 경로: posts/{userId}/{timestamp}-{filename})
  const uploadImage = async () => {
    if (!user || !selectedFile) {
      setError("파일을 선택해주세요.");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      // 파일 확장자 추출
      const fileExt = selectedFile.name.split(".").pop()?.toLowerCase() || "";
      
      // PRD 요구사항: posts/{userId}/{timestamp}-{filename}
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileName = `${timestamp}-${randomStr}.${fileExt}`;
      const filePath = `posts/${user.id}/${fileName}`;

      console.log("📤 이미지 업로드 시작:", {
        fileName,
        filePath,
        fileSize: formatFileSize(selectedFile.size),
        fileType: selectedFile.type,
      });

      // 업로드 진행률 시뮬레이션 (실제로는 Supabase가 진행률을 제공하지 않지만, UX를 위해 추가)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Supabase Storage에 업로드
      const { data, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: selectedFile.type,
        });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) {
        // 버킷이 없는 경우 명확한 에러 메시지
        if (uploadError.message.includes("Bucket not found") || uploadError.message.includes("not found")) {
          throw new Error(
            `Storage 버킷 "${STORAGE_BUCKET}"이(가) 생성되지 않았습니다.\n\n` +
            `Supabase Dashboard에서 버킷을 생성하거나, SQL Editor에서 다음 마이그레이션을 실행하세요:\n` +
            `supabase/migrations/setup_storage_my-sns.sql`
          );
        }
        throw uploadError;
      }

      console.log("✅ 이미지 업로드 완료:", data);

      // 성공 메시지
      setError(null);
      
      // 파일 목록 새로고침
      await fetchFiles();

      // 초기화
      setSelectedFile(null);
      setPreviewImage(null);
      setUploadProgress(0);
      
      // 파일 입력 초기화
      const fileInput = document.getElementById('image-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (err) {
      setUploadProgress(0);
      setError(
        err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.",
      );
      console.error("❌ 이미지 업로드 에러:", err);
    } finally {
      setUploading(false);
    }
  };

  // 파일 다운로드
  const downloadFile = async (fileName: string) => {
    if (!user) return;

    try {
      // PRD 요구사항: posts/{userId}/ 경로
      const filePath = `posts/${user.id}/${fileName}`;
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(filePath);

      if (error) {
        // 버킷이 없는 경우 명확한 에러 메시지
        if (error.message.includes("Bucket not found") || error.message.includes("not found")) {
          throw new Error(
            `Storage 버킷 "${STORAGE_BUCKET}"이(가) 생성되지 않았습니다.\n\n` +
            `Supabase Dashboard에서 버킷을 생성하거나, SQL Editor에서 다음 마이그레이션을 실행하세요:\n` +
            `supabase/migrations/setup_storage.sql`
          );
        }
        throw error;
      }

      // Blob을 다운로드 링크로 변환
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "파일 다운로드에 실패했습니다.",
      );
      console.error("Error downloading file:", err);
    }
  };

  // 파일 삭제
  const deleteFile = async (fileName: string) => {
    if (!user) return;
    if (!confirm(`${fileName} 파일을 삭제하시겠습니까?`)) return;

    try {
      // PRD 요구사항: posts/{userId}/ 경로
      const filePath = `posts/${user.id}/${fileName}`;
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);

      if (error) {
        // 버킷이 없는 경우 명확한 에러 메시지
        if (error.message.includes("Bucket not found") || error.message.includes("not found")) {
          throw new Error(
            `Storage 버킷 "${STORAGE_BUCKET}"이(가) 생성되지 않았습니다.\n\n` +
            `Supabase Dashboard에서 버킷을 생성하거나, SQL Editor에서 다음 마이그레이션을 실행하세요:\n` +
            `supabase/migrations/setup_storage.sql`
          );
        }
        throw error;
      }

      // 파일 목록 새로고침
      await fetchFiles();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "파일 삭제에 실패했습니다.",
      );
      console.error("Error deleting file:", err);
    }
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <LuTriangleAlert className="w-16 h-16 text-yellow-500" />
        <h1 className="text-2xl font-bold">로그인이 필요합니다</h1>
        <p className="text-gray-600">
          Storage 기능을 사용하려면 먼저 로그인해주세요.
        </p>
        <Link href="/">
          <Button>홈으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <Link
          href="/"
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          ← 홈으로 돌아가기
        </Link>
        <h1 className="text-4xl font-bold mb-2">Supabase Storage 테스트</h1>
        <p className="text-gray-600">
          파일 업로드, 다운로드, 삭제 기능을 테스트할 수 있습니다.
        </p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <LuTriangleAlert className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-800">에러</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="text-red-600"
          >
            닫기
          </Button>
        </div>
      )}

      {/* 이미지 업로드 (PRD 요구사항) */}
      <div className="mb-8 p-6 border rounded-lg">
        <h2 className="text-2xl font-bold mb-4">이미지 업로드 테스트</h2>
        <p className="text-sm text-gray-600 mb-4">
          최대 5MB, 허용 형식: {ALLOWED_EXTENSIONS.join(', ').toUpperCase()}
        </p>
        
        {/* 파일 선택 */}
        <div className="mb-4">
          <label htmlFor="image-upload" className="cursor-pointer">
            <Button disabled={uploading} variant="outline" asChild>
              <span>
                <LuUpload className="w-4 h-4 mr-2" />
                {selectedFile ? "이미지 변경" : "이미지 선택"}
              </span>
            </Button>
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
        </div>

        {/* 이미지 미리보기 */}
        {previewImage && (
          <div className="mb-4">
            <div className="relative inline-block">
              <img
                src={previewImage}
                alt="미리보기"
                className="max-w-full max-h-96 rounded-lg border border-gray-200"
              />
              {selectedFile && (
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {formatFileSize(selectedFile.size)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 업로드 진행률 */}
        {uploading && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">업로드 중...</span>
              <span className="text-sm font-semibold">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* 업로드 버튼 */}
        {selectedFile && !uploading && (
          <Button onClick={uploadImage} className="w-full">
            <LuUpload className="w-4 h-4 mr-2" />
            이미지 업로드
          </Button>
        )}

        {uploading && (
          <Button disabled className="w-full">
            업로드 중...
          </Button>
        )}
      </div>

      {/* 파일 목록 */}
      <div className="border rounded-lg">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">업로드된 파일</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFiles}
              disabled={loading}
            >
              {loading ? "로딩 중..." : "새로고침"}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            파일 목록을 불러오는 중...
          </div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <LuFile className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>업로드된 파일이 없습니다.</p>
            <p className="text-sm mt-2">위에서 파일을 업로드해보세요!</p>
          </div>
        ) : (
          <div className="divide-y">
            {files.map((file) => (
              <div
                key={file.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* 이미지 썸네일 또는 파일 아이콘 */}
                  {file.name.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <img
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/posts/${user.id}/${file.name}`}
                        alt={file.name}
                        className="w-full h-full object-cover rounded border border-gray-200"
                        onError={(e) => {
                          // 이미지 로드 실패 시 파일 아이콘 표시
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const icon = document.createElement('div');
                            icon.className = 'w-full h-full flex items-center justify-center bg-gray-100 rounded';
                            icon.innerHTML = '<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                            parent.appendChild(icon);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <LuFile className="w-8 h-8 text-gray-400 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {file.metadata &&
                      typeof file.metadata === "object" &&
                      "size" in file.metadata
                        ? formatFileSize(file.metadata.size as number)
                        : "크기 정보 없음"}{" "}
                      • {new Date(file.created_at).toLocaleString("ko-KR")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadFile(file.name)}
                  >
                    <LuDownload className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteFile(file.name)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <LuTrash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 사용자 정보 */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">현재 사용자</h3>
        <p className="text-sm text-gray-600">
          Email: {user.emailAddresses[0]?.emailAddress}
        </p>
      </div>
    </div>
  );
}
