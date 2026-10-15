import { MongoClient, ObjectId } from 'mongodb';
import type { NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/withAuth';
import { createHistoryEntries } from '@/utils/equipmentHistoryUtils';
import { NewEquipment } from '@/components/equipmentStockTable/types';
import { normalizeMapsUrl, MAPS_URL_ERROR } from '@/utils/mapsUtils';
import { getPermissions } from '@/utils/roleUtils';
import { withRealEquipmentPrices } from '@/lib/equipmentPriceGuard';
import { sanitizeEventForRole } from '@/lib/sanitizeEvent';
import { checkBookingConflicts } from '@/lib/bookingGuard';

// Todos pueden crear eventos según especificación
export const POST = withAuth(async (context: AuthContext, req: Request) => {
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const body = await req.json();
    const { _id, bands, createdAt, updatedAt, ...restBody } = body;
    let equipment = body.equipment;
    // Link de Google Maps del lugar: normalizar si viene, rechazar si no es de Maps
    if ('venueMapsUrl' in restBody) {
      const venueMapsUrl = normalizeMapsUrl(restBody.venueMapsUrl);
      if (venueMapsUrl === null) {
        return NextResponse.json({ error: MAPS_URL_ERROR }, { status: 400 });
      }
      restBody.venueMapsUrl = venueMapsUrl;
    }
    const db = client.db('degano-app');
    // Precios: quien no los ve arma el evento con equipos sin precio → se
    // completan con los reales de la base (y el total de alquiler).
    if (!getPermissions(context.role).canViewEquipmentPrices && Array.isArray(equipment)) {
      const priced = await withRealEquipmentPrices(db, equipment, []);
      equipment = priced.equipment;
      restBody.equipmentPrice = priced.equipmentPrice;
    }
    delete restBody.equipment;

    // IDEMPOTENCIA: si la request anterior se cortó (timeout) el evento puede
    // haber quedado creado. El folderId es único por formulario: si ya existe
    // un evento con ese folderId es un REINTENTO → no se crea otro, se
    // completa lo que haya quedado a medias y se devuelve el existente.
    const folderId =
      typeof restBody.folderId === 'string' && restBody.folderId ? restBody.folderId : null;
    const existing = folderId ? await db.collection('events').findOne({ folderId }) : null;

    // GUARD doble asignación: ningún equipo puede estar reservado por otro
    // evento en esas fechas. Se valida ANTES de crear nada. (En un reintento,
    // las reservas del propio evento no cuentan.)
    if (Array.isArray(equipment) && equipment.length && restBody.date && restBody.endDate) {
      const conflictMsg = await checkBookingConflicts(
        db,
        equipment.map((e: any) => String(e._id)),
        restBody.date,
        restBody.endDate,
        existing ? String(existing._id) : null
      );
      if (conflictMsg) {
        return NextResponse.json({ error: conflictMsg }, { status: 409 });
      }
    }
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
    let newEvent = existing;
    if (!newEvent) {
      const event = await db.collection('events').insertOne(document);
      newEvent = await db.collection('events').findOne({ _id: event.insertedId });
    }

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

      // PASO 1: Agregar scheduledUse a todos los equipos (sin duplicar: en un
      // reintento los que ya la tienen no se tocan)
      await db.collection<NewEquipment>('equipment').updateMany(
        {
          _id: { $in: equipment.map((eq: any) => new ObjectId(eq._id)) },
          'scheduledUses.eventId': { $ne: newEvent._id.toString() }
        },
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

      // Registrar uso en evento para cada equipo: UNA sola escritura (antes era
      // una por equipo y en eventos grandes la request se cortaba por tiempo).
      // En un reintento solo se agregan las que faltan.
      const alreadyLogged = existing
        ? new Set(
            (
              await db
                .collection('equipmentHistory')
                .find(
                  { eventId: newEvent._id.toString(), action: 'uso_evento' },
                  { projection: { equipmentId: 1 } }
                )
                .toArray()
            ).map((h: any) => String(h.equipmentId))
          )
        : new Set<string>();
      await createHistoryEntries(
        db,
        equipment
          .filter((eq: any) => !alreadyLogged.has(String(eq._id)))
          .map((eq: any) => ({
            equipmentId: eq._id,
            equipmentName: eq.name,
            equipmentCode: eq.code,
            action: 'uso_evento' as const,
            userId: context.user?.sub,
            eventId: newEvent!._id.toString(),
            eventName: document.type,
            eventDate: eventStart,
            eventEndDate: eventEnd,
            eventLocation: document.lugar,
            eventClientName: document.fullName,
            details: `${isCurrentOrPast ? 'Usado' : 'Programado para usar'} en ${document.type} - ${document.lugar}`
          }))
      );
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

    return NextResponse.json({ event: sanitizeEventForRole(newEvent, context.role) }, { status: 200 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'canCreateEvents' });
