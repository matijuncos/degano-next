import { MongoClient } from 'mongodb';
import type { NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/withAuth';
import { getPermissions, obfuscatePhone } from '@/utils/roleUtils';

export const GET = withAuth(
  async (context: AuthContext, req: NextRequest) => {
    try {
      const typedClientPromise: Promise<MongoClient> =
        clientPromise as Promise<MongoClient>;
      const client = await typedClientPromise;
      const db = client.db('degano-app');

      // Projection liviana: solo campos usados por calendario, lista de eventos y próximos eventos
      // Los campos pesados (equipment, bands, payment, music, timing, staff, playlist, etc.)
      // se cargan individualmente cuando se abre un evento via /api/getEvent?id=...
      const events = await db.collection('events').find({}, {
        projection: {
          _id: 1,
          date: 1,
          endDate: 1,
          type: 1,
          lugar: 1,
          fullName: 1,
          phoneNumber: 1,
          extraClients: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }).sort({ date: -1 }).toArray();

      // Obtener permisos del usuario
      const permissions = getPermissions(context.role);

      // Ofuscar datos sensibles según permisos
      const filteredEvents = events.map((event) => {
        const phoneNumber = permissions.canViewClientPhones
          ? event.phoneNumber
          : obfuscatePhone(event.phoneNumber, context.role, 'client');

        const extraClients = (event.extraClients || []).map((client: any) => ({
          ...client,
          phoneNumber: permissions.canViewClientPhones
            ? client.phoneNumber
            : obfuscatePhone(client.phoneNumber, context.role, 'client'),
        }));

        return {
          ...event,
          phoneNumber,
          extraClients,
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
