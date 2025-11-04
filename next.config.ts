import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // UTF-8 인코딩 명시적 설정
  webpack: (config) => {
    // UTF-8 인코딩 보장
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
  images: {
    remotePatterns: [
      { hostname: "img.clerk.com" },
      // Supabase Storage 이미지 도메인
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // DiceBear 아바타 이미지
      { hostname: "api.dicebear.com" },
    ],
  },
};

export default nextConfig;
