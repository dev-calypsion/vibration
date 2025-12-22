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
  const backendUrl = (process.env.BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
  
  try {
    const body = await request.text(); // Get raw body
    console.log(`Forwarding POST request to: ${backendUrl}/token`);

    // Forward the request to the actual backend
    const response = await fetch(`${backendUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'ngrok-skip-browser-warning': 'true',
      },
      body: body,
    });

    // Check if the response is JSON
    const contentType = response.headers.get("content-type");
    let data;
    if (contentType && contentType.indexOf("application/json") !== -1) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error(`Backend returned non-JSON response: ${text.substring(0, 200)}...`);
      data = { error: 'Backend returned non-JSON response', details: text.substring(0, 100) };
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
    console.error('Error forwarding request:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error.message,
      target: `${backendUrl}/token`
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}
