import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@auth0/nextjs-auth0';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { paths } = await req.json();

    // Revalidar múltiples paths si se proporcionan
    if (Array.isArray(paths)) {
      paths.forEach((path) => {
        revalidatePath(path);
      });
    }

    // Revalidar paths comunes relacionados con equipamiento
    revalidatePath('/equipment');
    revalidatePath('/api/equipment');

    return NextResponse.json({
      revalidated: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error revalidating:', error);
    return NextResponse.json(
      { error: 'Error revalidating' },
      { status: 500 }
    );
  }
}
