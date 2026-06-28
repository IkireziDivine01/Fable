import { NextResponse } from 'next/server';
import { auth } from './auth';
import {
  canAccessElderRoutes,
  canAccessKidRoutes,
  canAccessParentRoutes,
  roleHome,
} from './lib/roles';

const AUTH_PAGES = ['/auth/signin', '/auth/signup', '/auth/onboard', '/auth/pending'];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session?.user?.id;
  const role = session?.user?.role;
  const accountStatus = session?.user?.accountStatus;

  const isAuthPage =
    AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!isLoggedIn) {
    if (isAuthPage) return NextResponse.next();
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (isAuthPage && pathname !== '/auth/pending') {
    return NextResponse.redirect(new URL(roleHome(role, accountStatus), req.url));
  }

  if (role === 'kid' && accountStatus === 'pending' && !pathname.startsWith('/auth/pending')) {
    return NextResponse.redirect(new URL('/auth/pending', req.url));
  }

  if (pathname.startsWith('/parent') && !canAccessParentRoutes(role)) {
    return NextResponse.redirect(new URL(roleHome(role, accountStatus), req.url));
  }

  if (pathname.startsWith('/kid') && !canAccessKidRoutes(role, accountStatus)) {
    return NextResponse.redirect(new URL(roleHome(role, accountStatus), req.url));
  }

  if (pathname.startsWith('/elder') && !canAccessElderRoutes(role)) {
    return NextResponse.redirect(new URL(roleHome(role, accountStatus), req.url));
  }

  if (pathname === '/dashboard') {
    return NextResponse.redirect(new URL(roleHome(role, accountStatus), req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/parent/:path*',
    '/kid/:path*',
    '/elder/:path*',
    '/stories/:path*',
    '/auth/:path*',
  ],
};
