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
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  },
  async rewrites() {
    const backendUrl = (process.env.BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
    console.log('Rewrites using backend URL:', backendUrl);
    
    return [
      {
        source: '/api/token',
        destination: `${backendUrl}/token`, // Proxy Auth route (specific)
      },
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`, // Proxy other API routes
      },
    ];
  },
};

export default nextConfig;