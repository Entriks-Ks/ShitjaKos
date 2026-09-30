import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  experimental: {
    serverActions: {
      // Business creation may include one 8 MB logo and one 8 MB background.
      bodySizeLimit: "18mb",
    },
  },
};

export default nextConfig;
