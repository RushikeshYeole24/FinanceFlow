import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check for auth token in localStorage (client-side only)
  if (typeof window !== 'undefined') {
    const authToken = localStorage.getItem('authToken');
    
    // If trying to access auth page while logged in, redirect to home
    if (request.nextUrl.pathname === '/auth' && authToken) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // If trying to access protected pages while logged out, redirect to auth
    if (!authToken && request.nextUrl.pathname !== '/auth') {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}; 