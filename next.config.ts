import type { NextConfig } from "next";
import path from "path";
import { SECURE_HEADERS } from "./src/lib/secure-headers";

const nextConfig: NextConfig = {
  // Remove static export - we'll bundle the Next.js server with Electron
  experimental: {
    optimizePackageImports: [
      'framer-motion',
      'recharts',
      'zustand',
      'lucide-react',
      '@radix-ui/react-icons',
    ],
  },
  images: {
    unoptimized: true,
  },
  compress: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: Object.entries(SECURE_HEADERS).map(([key, value]) => ({ key, value })),
      },
    ];
  },
};

export default nextConfig;