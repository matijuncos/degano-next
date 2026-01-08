import { MongoClient } from 'mongodb';
import type { NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { withAuth, AuthContext } from '@/lib/withAuth';
import { getPermissions, obfuscatePrices, obfuscatePhone } from '@/utils/roleUtils';

export const GET = withAuth(
  async (context: AuthContext, req: NextRequest) => {
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
        // Ofuscar información de pagos si no tiene permiso
        const payment = permissions.canViewPayments ? event.payment : null;

        // Ofuscar precios de equipamiento si no tiene permiso
        const equipment = permissions.canViewEquipmentPrices
          ? event.equipment || []
          : obfuscatePrices(event.equipment || [], context.role);

        // Ofuscar teléfonos de clientes si no tiene permiso
        const phoneNumber = permissions.canViewClientPhones
          ? event.phoneNumber
          : obfuscatePhone(event.phoneNumber, context.role, 'client');

        // Ofuscar teléfonos de clientes extras
        const extraClients = (event.extraClients || []).map((client: any) => ({
          ...client,
          phoneNumber: permissions.canViewClientPhones
            ? client.phoneNumber
            : obfuscatePhone(client.phoneNumber, context.role, 'client'),
        }));

        // Ofuscar teléfonos de contactos de bandas/shows
        const bands = (event.bands || []).map((band: any) => ({
          ...band,
          contacts: (band.contacts || []).map((contact: any) => ({
            ...contact,
            phone: permissions.canViewShowPhones
              ? contact.phone
              : obfuscatePhone(contact.phone, context.role, 'show'),
          })),
        }));

        return {
          ...event,
          payment,
          equipment,
          phoneNumber,
          extraClients,
          bands,
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
  }
);
