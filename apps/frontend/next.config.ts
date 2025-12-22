import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/vibrationmodule',
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