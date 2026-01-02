import { MongoClient } from 'mongodb'; // Import ObjectId
import type { NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { withAuth, AuthContext } from '@/lib/withAuth';
import { getPermissions, obfuscatePrices } from '@/utils/roleUtils';

export const GET = withAuth(async (
  context: AuthContext,
  req: NextRequest,
  res: NextApiResponse
) => {
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const db = client.db('degano-app');
    const events = await db.collection('events').find().toArray();

    revalidatePath(req.nextUrl.pathname);

    // Obtener permisos del usuario
    const permissions = getPermissions(context.role);

    // Filtrar datos sensibles según permisos
    const filteredEvents = events.map((event) => {
      // Ocultar información de pagos si no tiene permiso
      const payment = permissions.canViewPayments ? event.payment : null;

      // Ofuscar precios de equipamiento si no tiene permiso
      const equipment = permissions.canViewEquipmentPrices
        ? event.equipment
        : obfuscatePrices(event.equipment || [], context.role);

      return {
        ...event,
        payment,
        equipment
      };
    });

    return NextResponse.json({ events: filteredEvents }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});
