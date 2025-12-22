import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CSV = (v?: string) =>
  (v || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

const allowedHosts = CSV(process.env.ALLOWED_HOSTS || 'link360.in,www.link360.in');

export function middleware(req: NextRequest) {
  const host = req.nextUrl.hostname.toLowerCase();

  const isAllowedExact = allowedHosts.includes(host);
  const isAllowedDev =
    host === 'localhost' ||
    host.endsWith('.ngrok-free.app');

  if (!isAllowedExact && !isAllowedDev) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/vibrationmodule/:path*'],
};
