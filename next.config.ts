import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { optimizePackageImports: ["lucide-react", "recharts", "@xyflow/react"] },
  serverExternalPackages: ["argon2", "pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;
