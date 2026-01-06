import { MongoClient, ObjectId } from 'mongodb'; // Import ObjectId
import type { NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/withAuth';
import { createHistoryEntry } from '@/utils/equipmentHistoryUtils';
import { NewEquipment } from '@/components/equipmentStockTable/types';

// Solo admin y manager pueden editar eventos
export const PUT = withAuth(async (context: AuthContext, req: Request, res: NextApiResponse) => {
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const body = await req.json();
    const db = client.db('degano-app');
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

    // Preparar datos para actualizar
    const { createdAt, updatedAt, ...updateData } = body;

    // Asegurar que updatedAt sea un timestamp y no sobrescribir createdAt
    const event = await db
      .collection('events')
      .findOneAndUpdate(
        { _id: new ObjectId(eventId) },
        {
          $set: {
            ...updateData,
            updatedAt: new Date()
          }
        },
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
    const keptEquipmentIds = oldEquipmentIds.filter(
      (id: string) => newEquipmentIds.includes(id)
    );

    const eventStart = new Date(body.date);
    const eventEnd = new Date(body.endDate);
    const now = new Date();

    // Resetear horas para comparación
    const eventStartDate = new Date(eventStart);
    eventStartDate.setHours(0, 0, 0, 0);
    const nowDate = new Date(now);
    nowDate.setHours(0, 0, 0, 0);

    // Determinar si el evento empieza HOY o ya empezó
    const isCurrentOrPast = eventStartDate <= nowDate;
    const eventoActivo = now <= eventEnd;

    // Crear el objeto scheduledUse actualizado
    const scheduledUse = {
      eventId: eventId,
      eventName: body.name || body.type,
      eventType: body.type,
      startDate: eventStart,
      endDate: eventEnd,
      location: body.lugar
    };

    // PASO 1: Actualizar scheduledUse para equipos que SIGUEN en el evento
    if (keptEquipmentIds.length > 0) {
      const keptObjectIds = keptEquipmentIds.map((id: string) => new ObjectId(id));

      // Remover el scheduledUse viejo y agregar el nuevo
      await db.collection<NewEquipment>('equipment').updateMany(
        { _id: { $in: keptObjectIds } },
        {
          $pull: { scheduledUses: { eventId: eventId } }
        }
      );

      await db.collection<NewEquipment>('equipment').updateMany(
        { _id: { $in: keptObjectIds } },
        {
          $push: { scheduledUses: {$each: [scheduledUse]} }
        }
      );

      // Si el evento es actual/pasado, actualizar estado
      if (isCurrentOrPast && eventoActivo) {
        await db.collection('equipment').updateMany(
          { _id: { $in: keptObjectIds } },
          {
            $set: {
              lastUsedStartDate: eventStart,
              lastUsedEndDate: eventEnd,
              location: body.lugar,
              outOfService: {
                isOut: true,
                reason: 'En Evento',
                details: `${body.type} - ${body.lugar}`
              }
            }
          }
        );
      } else if (!eventoActivo) {
        // Si el evento ya terminó, limpiar
        await db.collection('equipment').updateMany(
          { _id: { $in: keptObjectIds } },
          {
            $set: {
              lastUsedStartDate: null,
              lastUsedEndDate: null,
              location: 'Deposito',
              outOfService: {
                isOut: false,
                reason: null,
                details: null
              }
            }
          }
        );
      }
    }

    // PASO 2: Agregar scheduledUse para equipos NUEVOS
    if (addedEquipmentIds.length > 0) {
      const addedObjectIds = addedEquipmentIds.map((id: string) => new ObjectId(id));

      await db.collection<NewEquipment>('equipment').updateMany(
        { _id: { $in: addedObjectIds } },
        {
          $push: { scheduledUses: scheduledUse }
        }
      );

      // Si el evento es actual/pasado, actualizar estado
      if (isCurrentOrPast && eventoActivo) {
        await db.collection('equipment').updateMany(
          { _id: { $in: addedObjectIds } },
          {
            $set: {
              lastUsedStartDate: eventStart,
              lastUsedEndDate: eventEnd,
              location: body.lugar,
              outOfService: {
                isOut: true,
                reason: 'En Evento',
                details: `${body.type} - ${body.lugar}`
              }
            }
          }
        );
      }

      // Registrar en historial
      for (const eq of eventEquipment) {
        if (addedEquipmentIds.includes(eq._id.toString())) {
          await createHistoryEntry(db, {
            equipmentId: eq._id,
            equipmentName: eq.name,
            equipmentCode: eq.code,
            action: 'uso_evento',
            userId: context.user?.sub,
            eventId: eventId,
            eventName: body.type,
            eventDate: eventStart,
            eventLocation: body.lugar,
            details: `${isCurrentOrPast ? 'Agregado a' : 'Programado para'} ${body.type} - ${body.lugar}`
          });
        }
      }
    }

    // PASO 3: Remover scheduledUse para equipos REMOVIDOS
    if (removedEquipmentIds.length > 0) {
      const removedObjectIds = removedEquipmentIds.map((id: string) => new ObjectId(id));

      // Remover el scheduledUse de este evento
      await db.collection<NewEquipment>('equipment').updateMany(
        { _id: { $in: removedObjectIds } },
        {
          $pull: { scheduledUses: { eventId: eventId } }
        }
      );

      // Verificar si los equipos removidos tienen otros usos activos
      for (const eqId of removedEquipmentIds) {
        const equipment = await db.collection('equipment').findOne({
          _id: new ObjectId(eqId)
        });

        if (equipment) {
          const hasActiveUse = (equipment.scheduledUses || []).some((use: any) => {
            const startDate = new Date(use.startDate);
            const endDate = new Date(use.endDate);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            return nowDate >= startDate && nowDate <= endDate;
          });

          // Si no tiene otros usos activos, limpiar estado
          if (!hasActiveUse) {
            await db.collection('equipment').updateOne(
              { _id: new ObjectId(eqId) },
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
          }

          // Registrar en historial
          const equipmentData = oldEvent?.equipment?.find(
            (eq: any) => eq._id.toString() === eqId
          );
          if (equipmentData) {
            await createHistoryEntry(db, {
              equipmentId: eqId,
              equipmentName: equipmentData.name,
              equipmentCode: equipmentData.code,
              action: 'cambio_estado',
              userId: context.user?.sub,
              fromValue: 'En Evento',
              toValue: hasActiveUse ? 'En Evento (otro)' : 'Disponible',
              details: `Removido de ${oldEvent?.type} - ${oldEvent?.lugar}`
            });
          }
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
}, { requiredPermission: 'canEditEvents' });
