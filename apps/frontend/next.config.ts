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
    const backendUrl = (process.env.BACKEND_URL || 'http://localhost:8000').trim().replace(/\/$/, '');
    console.log('Rewrites using backend URL:', backendUrl);
    
    return [
      // {
      //   source: '/api/token',
      //   destination: `${backendUrl}/token`, 
      // },
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;