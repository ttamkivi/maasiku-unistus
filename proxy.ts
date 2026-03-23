import { NextRequest, NextResponse } from 'next/server';

// Hardcoded to avoid importing server-only lib/auth in proxy context
const SESSION_COOKIE = 'mu_session';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/admin',
  '/teacher',
  '/parent',
  '/student',
];

const PUBLIC_PREFIXES = [
  '/auth/',
  '/demo',
  '/legal',
  '/privacy',
  '/consent/',
  '/api/analyze',
  '/api/generate-docx',
  '/api/cookie-consent',
  '/api/feedback',
];

const AUTH_PAGES = ['/auth/login', '/auth/register', '/auth/eid', '/auth/forgot-password'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/') return NextResponse.next();

  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  const isLoggedIn = !!sessionCookie?.value;

  // Redirect logged-in users away from auth pages to dashboard
  if (isLoggedIn && AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  for (const prefix of PUBLIC_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix)) {
      return NextResponse.next();
    }
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );

  if (!isProtected) return NextResponse.next();

  if (!isLoggedIn) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
