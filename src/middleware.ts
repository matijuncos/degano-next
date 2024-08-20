import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';
import { NextRequest, NextResponse } from 'next/server';

// Define a function to add cache headers
function addCacheHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('Surrogate-Control', 'no-store');
  return response;
}

// Middleware function
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply auth middleware to /calendar route
  if (pathname.startsWith('/calendar')) {
    return withMiddlewareAuthRequired()(request, {} as any);
  }

  // Apply cache headers middleware to /api routes
  if (pathname.startsWith('/api')) {
    const response = NextResponse.next();
    addCacheHeaders(response);
    return response;
  }

  // Default response if no conditions are met
  return NextResponse.next();
}

// Export the configuration for the middleware
export const config = {
  matcher: ['/calendar', '/api/:path*'],
};
