import { NextRequest, NextResponse } from 'next/server';

function addCacheHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('Surrogate-Control', 'no-store');

  return response;
}

export default async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  addCacheHeaders(response);
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
