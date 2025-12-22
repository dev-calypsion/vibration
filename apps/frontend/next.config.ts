import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/vibrationmodule',
  // trailingSlash: true, // Removed to prevent 308 redirects on API calls which block CORS preflights
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, ngrok-skip-browser-warning" },
        ]
      }
    ]
  },
  async rewrites() {
    // We are now using a manual API Route Proxy (app/api/[...path]/route.ts)
    // to allow for dynamic BACKEND_URL configuration via cookies.
    // This removes the need for static rewrites here.
    return [];
  },
};

export default nextConfig;