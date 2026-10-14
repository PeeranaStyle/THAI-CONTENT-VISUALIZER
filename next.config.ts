import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { optimizePackageImports: ["lucide-react", "recharts", "@xyflow/react"] },
  serverExternalPackages: ["argon2", "pdf-parse"],
};

export default nextConfig;
