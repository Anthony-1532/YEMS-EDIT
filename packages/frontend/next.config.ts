import type { NextConfig } from "next";

// API base URL comes from the environment; falls back to localhost for local dev.
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4001/api";
// Backend origin (without the trailing /api) is needed for the /health proxy.
const backendOrigin = apiBaseUrl.replace(/\/api\/?$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl}/:path*`,
      },
      {
        source: "/health/:path*",
        destination: `${backendOrigin}/health/:path*`,
      },
    ];
  },
};

export default nextConfig;
