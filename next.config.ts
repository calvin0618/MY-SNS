import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
