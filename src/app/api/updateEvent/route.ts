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

    console.log('=== UPDATE EVENT CALLED ===');
    console.log('Event ID:', eventId);
    console.log('Equipment in body:', eventEquipment?.length || 0, 'items');
    console.log('Nueva fecha:', body.date);
    console.log('Nueva fecha fin:', body.endDate);

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

    // Detectar equipos REMOVIDOS y AGREGADOS
    const oldEquipmentIds = (oldEvent?.equipment || []).map(
      (eq: any) => eq._id.toString()
    );
    const newEquipmentIds = (eventEquipment || []).map((eq: any) =>
      eq._id.toString()
    );
    const addedEquipmentIds = newEquipmentIds.filter(
      (id: string) => !oldEquipmentIds.includes(id)
    );
    const removedEquipmentIds = oldEquipmentIds.filter(
      (id: string) => !newEquipmentIds.includes(id)
    );

    if (eventEquipment?.length) {
      const eventStart = new Date(body.date);
      const eventEnd = new Date(body.endDate);
      const now = new Date();

      console.log('=== ACTUALIZANDO FECHAS DE EQUIPAMIENTO ===');
      console.log('Nueva fecha inicio:', eventStart);
      console.log('Nueva fecha fin:', eventEnd);
      console.log('Fecha actual:', now);
      console.log('Equipos a actualizar:', eventEquipment.map((eq: any) => eq._id));

      // Determinar si el evento sigue activo
      const eventoActivo = now <= eventEnd;
      console.log('¿Evento activo?', eventoActivo);

      // Actualizar equipos según si el evento está activo o terminó
      const updateResult = await db.collection('equipment').updateMany(
        { _id: { $in: eventEquipment.map((eq: any) => new ObjectId(eq._id)) } },
        {
          $set: {
            lastUsedStartDate: eventStart,
            lastUsedEndDate: eventEnd,
            location: eventoActivo ? body.lugar : 'Deposito',
            outOfService: eventoActivo
              ? {
                  isOut: true,
                  reason: 'En Evento',
                  details: `${body.type} - ${body.lugar}`
                }
              : {
                  isOut: false,
                  reason: null,
                  details: null
                }
          }
        }
      );

      console.log('Resultado actualización:', {
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount,
        estadoFinal: eventoActivo ? 'En Evento' : 'Disponible'
      });

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

    // Liberar equipos removidos del evento
    if (removedEquipmentIds.length > 0) {
      const removedObjectIds = removedEquipmentIds.map((id) => new ObjectId(id));

      await db.collection('equipment').updateMany(
        { _id: { $in: removedObjectIds } },
        {
          $set: {
            location: 'Deposito',
            lastUsedStartDate: null,
            lastUsedEndDate: null,
            outOfService: {
              isOut: false,
              reason: null,
              details: null
            }
          }
        }
      );

      // Registrar liberación en el historial
      for (const eqId of removedEquipmentIds) {
        const equipment = oldEvent?.equipment?.find(
          (eq: any) => eq._id.toString() === eqId
        );
        if (equipment) {
          await createHistoryEntry(db, {
            equipmentId: eqId,
            equipmentName: equipment.name,
            equipmentCode: equipment.code,
            action: 'cambio_estado',
            userId: session?.user?.sub,
            fromValue: 'En Evento',
            toValue: 'Disponible',
            details: `Removido de ${oldEvent.type} - ${oldEvent.lugar}`
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
