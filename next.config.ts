import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    ".prisma-app",
    "@prisma/client",
    "@prisma/adapter-libsql",
    "@libsql/client",
    "prisma",
    "@anthropic-ai/sdk",
  ],
};

export default nextConfig;
