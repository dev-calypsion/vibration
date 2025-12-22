import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if the request is for the API
  // We check for /api/ in the path. 
  // Note: pathname might include basePath '/vibrationmodule' depending on Next.js version/config
  if (request.nextUrl.pathname.includes('/api/')) {
    
    // Handle Preflight (OPTIONS) requests directly
    // This is critical because the backend (FastAPI) might return 405 Method Not Allowed for OPTIONS
    // which causes the CORS preflight to fail in the browser.
    if (request.method === 'OPTIONS') {
       return new NextResponse(null, {
         status: 200,
         headers: {
           'Access-Control-Allow-Origin': '*',
           'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
           'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, ngrok-skip-browser-warning',
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
