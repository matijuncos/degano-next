import { MongoClient, ObjectId } from 'mongodb'; // Import ObjectId
import type { NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { createHistoryEntry } from '@/utils/equipmentHistoryUtils';

export const PUT = async function handler(req: Request, res: NextApiResponse) {
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const body = await req.json();
    const db = client.db('degano-app');
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const eventId = body._id;
    const eventEquipment = body.equipment;
    delete body._id;

    // Obtener evento antiguo para comparar equipos
    const oldEvent = await db
      .collection('events')
      .findOne({ _id: new ObjectId(eventId) });

    const event = await db
      .collection('events')
      .findOneAndUpdate(
        { _id: new ObjectId(eventId) },
        { $set: body },
        { returnDocument: 'after' }
      );

    if (eventEquipment?.length) {
      const eventStart = new Date(body.date);
      const eventEnd = new Date(body.endDate);

      // Detectar equipos NUEVOS (solo los que se agregaron)
      const oldEquipmentIds = (oldEvent?.equipment || []).map(
        (eq: any) => eq._id.toString()
      );
      const newEquipmentIds = eventEquipment.map((eq: any) =>
        eq._id.toString()
      );
      const addedEquipmentIds = newEquipmentIds.filter(
        (id: string) => !oldEquipmentIds.includes(id)
      );

      await db.collection('equipment').updateMany(
        { _id: { $in: eventEquipment.map((eq: any) => new ObjectId(eq._id)) } },
        {
          $set: {
            lastUsedStartDate: eventStart,
            lastUsedEndDate: eventEnd
          }
        }
      );

      // Registrar uso en evento SOLO para equipos agregados
      for (const eq of eventEquipment) {
        if (addedEquipmentIds.includes(eq._id.toString())) {
          await createHistoryEntry(db, {
            equipmentId: eq._id,
            equipmentName: eq.name,
            equipmentCode: eq.code,
            action: 'uso_evento',
            userId: session?.user?.sub,
            eventId: eventId,
            eventName: body.type,
            eventDate: eventStart,
            eventLocation: body.lugar,
            details: `Agregado a ${body.type} - ${body.lugar}`
          });
        }
      }
    }
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};
