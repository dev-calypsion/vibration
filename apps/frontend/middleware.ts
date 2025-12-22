import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if the request is for the API
  // We check for /api/ in the path. 
  // Note: pathname might include basePath '/vibrationmodule' depending on Next.js version/config
  if (request.nextUrl.pathname.includes('/api/')) {
    
    // Handle Preflight (OPTIONS) requests directly
    if (request.method === 'OPTIONS') {
       return new NextResponse(null, {
         status: 200,
         headers: {
           'Access-Control-Allow-Origin': '*',
           'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
           'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning',
           'Access-Control-Max-Age': '86400',
         },
       });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  // Match all API routes
  matcher: '/api/:path*',
};
