import { MongoClient, ObjectId } from 'mongodb';
import type { NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';

export const POST = async function handler(req: Request, res: NextApiResponse) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const body = await req.json();
    const { _id, bands, equipment, ...bodyWithoutId } = body;
    const db = client.db('degano-app');
    const timestamp = new Date();
    const bandsWithIds = (bands || []).map((b: any) => ({
      ...b,
      _id: new ObjectId()
    }));
    const document = {
      ...(!_id ? bodyWithoutId : body),
      bands: bandsWithIds,
      equipment,
      createdAt: !_id ? timestamp : undefined,
      updatedAt: timestamp
    };
    const event = await db.collection('events').insertOne(document);
    const newEvent = await db
      .collection('events')
      .findOne({ _id: event.insertedId });

    if (equipment?.length && newEvent) {
      const eventStart = new Date(document.date);
      const eventEnd = new Date(document.endDate);

      await db.collection('equipment').updateMany(
        { _id: { $in: equipment.map((eq: any) => new ObjectId(eq._id)) } },
        {
          $set: {
            lastUsedStartDate: eventStart,
            lastUsedEndDate: eventEnd
          }
        }
      );
    }

    const existingClient = await db
      .collection('clients')
      .findOne({ email: body.email });

    if (!existingClient) {
      await db.collection('clients').insertOne({
        fullName: body.fullName,
        phoneNumber: body.phoneNumber,
        email: body.email,
        age: body.age || '',
        address: body.address || '',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    if (Array.isArray(body.extraClients) && body.extraClients.length > 0) {
      for (const extra of body.extraClients) {
        const extraId =
          extra._id && ObjectId.isValid(extra._id)
            ? new ObjectId(extra._id)
            : null;

        // Buscar por _id o por email
        let existingExtra = null;
        if (extraId) {
          existingExtra = await db
            .collection('clients')
            .findOne({ _id: extraId });
        } else if (extra.email) {
          existingExtra = await db
            .collection('clients')
            .findOne({ email: extra.email });
        }

        // Crear si no existe
        if (!existingExtra) {
          await db.collection('clients').insertOne({
            fullName: extra.fullName,
            phoneNumber: extra.phoneNumber,
            email: extra.email,
            age: extra.age || '',
            address: extra.address || '',
            rol: extra.rol,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } else {
          // Actualizar si ya existe
          await db.collection('clients').updateOne(
            { _id: existingExtra._id },
            {
              $set: {
                fullName: extra.fullName,
                phoneNumber: extra.phoneNumber,
                email: extra.email,
                age: extra.age || '',
                address: extra.address || '',
                rol: extra.rol,
                updatedAt: new Date()
              }
            }
          );
        }
      }
    }

    return NextResponse.json({ event: newEvent }, { status: 200 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};
