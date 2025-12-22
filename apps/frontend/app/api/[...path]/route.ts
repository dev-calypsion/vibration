import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend-config';

// Handle all other API methods
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, await params);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, await params);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, await params);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, await params);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, await params);
}

export async function OPTIONS(request: NextRequest) {
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

async function handleProxy(request: NextRequest, params: { path: string[] }) {
  const backendUrl = getBackendUrl(request);
  const path = params.path.join('/');
  const targetUrl = `${backendUrl}/api/${path}${request.nextUrl.search}`;

  console.log(`[API/PROXY] Proxying ${request.method} /api/${path} -> ${targetUrl}`);

  try {
    const headers = new Headers(request.headers);
    // Remove host header to avoid issues
    headers.delete('host');
    headers.delete('connection');
    headers.set('ngrok-skip-browser-warning', 'true');
    
    // Forward the request
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
      // @ts-ignore - duplexy stuff needed for streaming sometimes, but usually fine
      duplex: 'half' 
    });

    // Handle 308/Redirects if needed (similar to token route)
    // But for general API, we just stream back the response
    
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });

  } catch (error: any) {
    console.error(`[API/PROXY] Error proxying to ${targetUrl}:`, error);
    return NextResponse.json({
      error: 'Proxy Error',
      message: error.message,
      target: targetUrl
    }, { status: 500 });
  }
}
