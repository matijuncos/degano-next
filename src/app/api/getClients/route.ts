import clientPromise from '@/lib/mongodb';
import { MongoClient } from 'mongodb';
import type { NextApiResponse } from 'next';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/withAuth';
import { getPermissions, obfuscatePhone } from '@/utils/roleUtils';

export const GET = withAuth(async (context: AuthContext, req: NextRequest, res: NextApiResponse) => {
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const db = client.db('degano-app');
    const clients = await db.collection('clients').find().toArray();

    const permissions = getPermissions(context.role);

    // Ofuscar teléfonos según permisos
    const filteredClients = clients.map((client: any) => ({
      ...client,
      phoneNumber: obfuscatePhone(client.phoneNumber, context.role, 'client'),
    }));

    // Invalidate cache for the specific path after fetching new data
    revalidatePath(req.nextUrl.pathname);

    return NextResponse.json({ clients: filteredClients }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'canViewClients' });
