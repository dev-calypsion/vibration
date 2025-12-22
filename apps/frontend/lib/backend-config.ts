import { NextRequest } from 'next/server';

export function getBackendUrl(request: NextRequest): string {
  // 1. Try to get from cookie (Dynamic Dev Override)
  const cookieUrl = request.cookies.get('vg_backend_url')?.value;
  if (cookieUrl) {
    const decoded = decodeURIComponent(cookieUrl).trim().replace(/\/$/, '');
    if (decoded.startsWith('http')) {
      return decoded;
    }
  }

  // 2. Fallback to Environment Variable
  return (process.env.BACKEND_URL || 'http://localhost:8000').trim().replace(/\/$/, '');
}
