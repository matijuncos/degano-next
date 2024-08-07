import { NextRequest, NextResponse } from 'next/server';
import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';

function addCacheHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('Surrogate-Control', 'no-store');

  return response;
}

export default async function middleware(request: NextRequest) {
  if(request.nextUrl.pathname.startsWith('/api/:path*')) {
    const response = NextResponse.next();
    addCacheHeaders(response);
    return response;
  }
  if (request.nextUrl.pathname.startsWith('/calendar')) {
    return withMiddlewareAuthRequired();
  }
}
