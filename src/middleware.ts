import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// Middleware function
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

    // Get the base URL (protocol + host)
    const host = request.nextUrl.origin;

  // Invalidate cache for all get requests
  if (request.method === 'GET' && pathname !== '/api/auth/me') {
    await fetch(`${host}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path: pathname}),
    });
  }

  // Apply auth middleware to /calendar route
  if (pathname.startsWith('/calendar')) {
    return withMiddlewareAuthRequired()(request, {} as any);
  }

  // Default response if no conditions are met
  return NextResponse.next();
}

// Export the configuration for the middleware
export const config = {
  matcher: ['/calendar', '/api/:path*'],
};
