import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

// Route yang tidak perlu auth
const PUBLIC_PATHS = ['/login', '/attendance', '/display'];

// Map role → prefix path yang diizinkan
const ROLE_PATHS: Record<string, string[]> = {
  OWNER:     ['/owner'],
  MANAGER:   ['/manager', '/attendance'],
  CASHIER:   ['/cashier', '/attendance'],
  MEMBER:    ['/owner', '/member'],
};

function isDocumentRequest(request: NextRequest) {
  const acceptHeader = request.headers.get('accept') ?? '';
  const fetchDest    = request.headers.get('sec-fetch-dest') ?? '';
  return acceptHeader.includes('text/html') || fetchDest === 'document';
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // No-cache untuk HTML
  if (isDocumentRequest(request)) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  const { pathname } = request.nextUrl;

  // Public paths → langsung lewat
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname === '/') {
    return response;
  }

  // Cek token
  const accessToken = request.cookies.get('accessToken')?.value;
  if (!accessToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const decoded = jwtDecode<{ role: string; exp: number }>(accessToken);

    // Token expired → redirect login
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      const refreshToken = request.cookies.get('refreshToken')?.value;
      if (!refreshToken) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      // Ada refresh token → biarkan client-side handle
      return response;
    }

    // Cek akses path berdasarkan role
    const allowedPaths = ROLE_PATHS[decoded.role] || [];
    const isAllowed = allowedPaths.some((p) => pathname.startsWith(p));

    if (!isAllowed) {
      // Redirect ke home role masing-masing
      const homeMap: Record<string, string> = {
        OWNER:     '/owner/dashboard',
        MANAGER:   '/manager/dashboard',
        CASHIER:   '/cashier/dashboard',
        MEMBER:    '/owner/dashboard',
      };
      return NextResponse.redirect(new URL(homeMap[decoded.role] || '/login', request.url));
    }
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
