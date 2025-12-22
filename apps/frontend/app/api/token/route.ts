import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(request: NextRequest) {
  // Debug: Log environment
  const backendUrl = (process.env.BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
  console.log(`[API/TOKEN] Processing login request. Backend: ${backendUrl}`);

  try {
    const body = await request.text();
    
    // Attempt 1: POST to /token
    let targetUrl = `${backendUrl}/token`;
    console.log(`[API/TOKEN] Fetching: ${targetUrl}`);
    
    let response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'ngrok-skip-browser-warning': 'true',
      },
      body: body,
      redirect: 'manual', // Don't follow redirects automatically
    });

    console.log(`[API/TOKEN] Response 1: ${response.status}`);

    // If we get a redirect (307/308) or 405, try adding a trailing slash
    // FastAPI often redirects /token -> /token/ which turns POST into GET if followed automatically
    if (response.status === 307 || response.status === 308 || response.status === 405) {
       targetUrl = `${backendUrl}/token/`;
       console.log(`[API/TOKEN] 405/Redirect detected. Retrying with trailing slash: ${targetUrl}`);
       response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'ngrok-skip-browser-warning': 'true',
        },
        body: body,
      });
      console.log(`[API/TOKEN] Response 2: ${response.status}`);
    }

    // Handle non-JSON responses
    const contentType = response.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error(`[API/TOKEN] Non-JSON Response: ${text.substring(0, 100)}`);
      // If 405 still persists, return useful debug info
      if (response.status === 405) {
         data = { 
           error: 'Method Not Allowed (405)', 
           debug_suggestion: 'Check backend URL and trailing slashes.',
           target_attempted: targetUrl,
           backend_response: text.substring(0, 200)
         };
      } else {
         data = { error: 'Unexpected response format', details: text.substring(0, 100) };
      }
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning',
      },
    });

  } catch (error: any) {
    console.error('[API/TOKEN] Error:', error);
    return NextResponse.json({ 
      error: 'Internal Proxy Error', 
      message: error.message,
      target: `${backendUrl}/token`
    }, { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}
