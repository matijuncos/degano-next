import { MongoClient, ObjectId } from 'mongodb';
import type { NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/withAuth';
import { createHistoryEntry } from '@/utils/equipmentHistoryUtils';
import { NewEquipment } from '@/components/equipmentStockTable/types';

// Todos pueden crear eventos según especificación
export const POST = withAuth(async (context: AuthContext, req: Request) => {
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const body = await req.json();
    const { _id, bands, equipment, createdAt, updatedAt, ...restBody } = body;
    const db = client.db('degano-app');
    const timestamp = new Date();
    const bandsWithIds = (bands || []).map((b: any) => ({
      ...b,
      _id: new ObjectId(b._id)
    }));
    const document = {
      ...restBody,
      bands: bandsWithIds,
      equipment,
      ...(!_id && { createdAt: timestamp }),
      updatedAt: timestamp
    };
    const event = await db.collection('events').insertOne(document);
    const newEvent = await db
      .collection('events')
      .findOne({ _id: event.insertedId });

    if (equipment?.length && newEvent) {
      const eventStart = new Date(document.date);
      const eventEnd = new Date(document.endDate);
      const now = new Date();

      // Resetear horas para comparación
      const eventStartDate = new Date(eventStart);
      eventStartDate.setHours(0, 0, 0, 0);
      const nowDate = new Date(now);
      nowDate.setHours(0, 0, 0, 0);

      // Crear el objeto scheduledUse para este evento
      const scheduledUse = {
        eventId: newEvent._id.toString(),
        eventName: document.name || document.type,
        eventType: document.type,
        startDate: eventStart,
        endDate: eventEnd,
        location: document.lugar
      };

      // Determinar si el evento empieza HOY o ya empezó
      const isCurrentOrPast = eventStartDate <= nowDate;

      // PASO 1: Agregar scheduledUse a todos los equipos
      await db.collection<NewEquipment>('equipment').updateMany(
        { _id: { $in: equipment.map((eq: any) => new ObjectId(eq._id)) } },
        {
          $push: { scheduledUses: scheduledUse }
        }
      );

      // PASO 2: Si el evento empieza HOY o ya empezó, actualizar estado actual
      if (isCurrentOrPast) {
        await db.collection('equipment').updateMany(
          { _id: { $in: equipment.map((eq: any) => new ObjectId(eq._id)) } },
          {
            $set: {
              lastUsedStartDate: eventStart,
              lastUsedEndDate: eventEnd,
              location: document.lugar,
              outOfService: {
                isOut: true,
                reason: 'En Evento',
                details: `${document.type} - ${document.lugar}`
              }
            }
          }
        );
      }

      // Registrar uso en evento para cada equipo
      for (const eq of equipment) {
        await createHistoryEntry(db, {
          equipmentId: eq._id,
          equipmentName: eq.name,
          equipmentCode: eq.code,
          action: 'uso_evento',
          userId: context.user?.sub,
          eventId: newEvent._id.toString(),
          eventName: document.type,
          eventDate: eventStart,
          eventLocation: document.lugar,
          details: `${isCurrentOrPast ? 'Usado' : 'Programado para usar'} en ${document.type} - ${document.lugar}`
        });
      }
    }

    const existingClient = await db
      .collection('clients')
      .findOne({ fullName: body.fullName, phoneNumber: body.phoneNumber });

    if (!existingClient) {
      const clientData: any = {
        fullName: body.fullName,
        phoneNumber: body.phoneNumber,
        age: body.age || '',
        address: body.address || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      if (body.email) {
        clientData.email = body.email;
      }
      await db.collection('clients').insertOne(clientData);
    }

    if (Array.isArray(body.extraClients) && body.extraClients.length > 0) {
      for (const extra of body.extraClients) {
        const extraId =
          extra._id && ObjectId.isValid(extra._id)
            ? new ObjectId(extra._id)
            : null;

        // Buscar por _id o por fullName + phoneNumber
        let existingExtra = null;
        if (extraId) {
          existingExtra = await db
            .collection('clients')
            .findOne({ _id: extraId });
        } else {
          existingExtra = await db
            .collection('clients')
            .findOne({ fullName: extra.fullName, phoneNumber: extra.phoneNumber });
        }

        // Crear si no existe
        if (!existingExtra) {
          const extraClientData: any = {
            fullName: extra.fullName,
            phoneNumber: extra.phoneNumber,
            age: extra.age || '',
            address: extra.address || '',
            rol: extra.rol,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          if (extra.email) {
            extraClientData.email = extra.email;
          }
          await db.collection('clients').insertOne(extraClientData);
        } else {
          // Actualizar si ya existe
          const updateData: any = {
            fullName: extra.fullName,
            phoneNumber: extra.phoneNumber,
            age: extra.age || '',
            address: extra.address || '',
            rol: extra.rol,
            updatedAt: new Date()
          };
          if (extra.email) {
            updateData.email = extra.email;
          }
          await db.collection('clients').updateOne(
            { _id: existingExtra._id },
            {
              $set: updateData
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
}, { requiredPermission: 'canCreateEvents' });
