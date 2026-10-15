import { MongoClient, ObjectId } from 'mongodb'; // Import ObjectId
import type { NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/withAuth';
import { createHistoryEntries } from '@/utils/equipmentHistoryUtils';
import { releaseEquipmentFromEvent } from '@/lib/equipmentRelease';
import { NewEquipment } from '@/components/equipmentStockTable/types';
import { normalizeMapsUrl, MAPS_URL_ERROR } from '@/utils/mapsUtils';
import { getPermissions } from '@/utils/roleUtils';
import { withRealEquipmentPrices } from '@/lib/equipmentPriceGuard';
import { sanitizeEventForRole } from '@/lib/sanitizeEvent';
import { checkBookingConflicts } from '@/lib/bookingGuard';

// Solo admin y manager pueden editar eventos
export const PUT = withAuth(async (context: AuthContext, req: Request) => {
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

    // Link de Google Maps del lugar: normalizar si viene, rechazar si no es de Maps
    if ('venueMapsUrl' in updateData) {
      const venueMapsUrl = normalizeMapsUrl(updateData.venueMapsUrl);
      if (venueMapsUrl === null) {
        return NextResponse.json({ error: MAPS_URL_ERROR }, { status: 400 });
      }
      updateData.venueMapsUrl = venueMapsUrl;
    }

    // GUARD teléfonos: nunca persistir un teléfono ofuscado ('****'). Si un rol
    // sin permiso para ver teléfonos edita el evento, el phoneNumber llega como
    // '****'; restauramos el real (del evento viejo, o del cliente referenciado)
    // para no corromper el dato. Aplica a cliente principal y clientes extra.
    const isObfuscatedPhone = (v: any) =>
      typeof v === 'string' && /^\*+$/.test(v.trim());

    if (isObfuscatedPhone(updateData.phoneNumber)) {
      updateData.phoneNumber = oldEvent?.phoneNumber ?? '';
    }

    if (Array.isArray(updateData.extraClients)) {
      updateData.extraClients = await Promise.all(
        updateData.extraClients.map(async (ec: any) => {
          if (!isObfuscatedPhone(ec?.phoneNumber)) return ec;
          // 1) restaurar desde el mismo extra client del evento viejo (por _id)
          const match = Array.isArray(oldEvent?.extraClients)
            ? oldEvent!.extraClients.find(
                (e: any) => e?._id && ec?._id && String(e._id) === String(ec._id)
              )
            : null;
          if (match) return { ...ec, phoneNumber: match.phoneNumber ?? '' };
          // 2) si referencia un cliente existente, tomar el teléfono real
          if (ec?._id) {
            try {
              const realClient = await db
                .collection('clients')
                .findOne({ _id: new ObjectId(String(ec._id)) });
              if (realClient) {
                return { ...ec, phoneNumber: realClient.phoneNumber ?? '' };
              }
            } catch {
              /* _id no es ObjectId válido; caemos al default */
            }
          }
          // 3) sin forma de resolverlo → no persistir '****'
          return { ...ec, phoneNumber: '' };
        })
      );
    }

    // GUARD doble asignación: los equipos NUEVOS del evento (o todos, si
    // cambiaron las fechas) no pueden estar reservados por otro evento en
    // esas fechas. Se valida ANTES de escribir nada.
    if (Array.isArray(eventEquipment) && body.date && body.endDate) {
      const prevIds = new Set((oldEvent?.equipment || []).map((e: any) => String(e._id)));
      const datesChanged =
        +new Date(oldEvent?.date as any) !== +new Date(body.date) ||
        +new Date(oldEvent?.endDate as any) !== +new Date(body.endDate);
      const toCheck = eventEquipment
        .map((e: any) => String(e._id))
        .filter((id: string) => datesChanged || !prevIds.has(id));
      const conflictMsg = await checkBookingConflicts(db, toCheck, body.date, body.endDate, eventId);
      if (conflictMsg) {
        return NextResponse.json({ error: conflictMsg }, { status: 409 });
      }
    }

    // GUARD datos ocultos: lo que el rol no puede ver le llega vacío/null desde
    // getEvent, así que NUNCA se persiste lo que manda (pisaría lo real).
    const permissions = getPermissions(context.role);
    // Pagos/presupuesto: solo admin. Al resto le llega payment: null.
    if (!permissions.canViewPayments) delete updateData.payment;
    // Precios de equipos: solo admin. Se completan con los reales.
    if (!permissions.canViewEquipmentPrices) {
      if (Array.isArray(updateData.equipment)) {
        const priced = await withRealEquipmentPrices(db, updateData.equipment, oldEvent?.equipment);
        updateData.equipment = priced.equipment;
        updateData.equipmentPrice = priced.equipmentPrice;
      } else {
        delete updateData.equipmentPrice;
      }
    }

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

    // PERF: detectar si cambió algo relacionado a equipamiento. Los scheduledUses
    // dependen de: equipos, fechas, lugar, tipo y nombre del evento. Si nada de eso
    // cambió, NO hay que reprocesarlos (evita 2-3 updateMany pesados en cada edición
    // de otros campos, ej. el nombre del cliente).
    const oldEqIds = (oldEvent?.equipment || [])
      .map((e: any) => e._id?.toString())
      .sort();
    const newEqIds = (eventEquipment || [])
      .map((e: any) => e._id?.toString())
      .sort();
    const equipmentRelatedChanged =
      oldEqIds.length !== newEqIds.length ||
      oldEqIds.some((id: string, i: number) => id !== newEqIds[i]) ||
      +new Date(oldEvent?.date as any) !== +new Date(body.date) ||
      +new Date(oldEvent?.endDate as any) !== +new Date(body.endDate) ||
      (oldEvent?.lugar || '') !== (body.lugar || '') ||
      (oldEvent?.type || '') !== (body.type || '') ||
      (oldEvent?.name || '') !== (body.name || '');

    // Solo procesar diff de equipamiento si el body incluye equipment (evita
    // corrupción en ediciones parciales) Y realmente cambió algo relevante.
    if (
      eventEquipment !== undefined &&
      body.date &&
      body.endDate &&
      equipmentRelatedChanged
    ) {
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

        // Registrar en historial: UNA sola escritura (antes una por equipo)
        await createHistoryEntries(
          db,
          eventEquipment
            .filter((eq: any) => addedEquipmentIds.includes(eq._id.toString()))
            .map((eq: any) => ({
              equipmentId: eq._id,
              equipmentName: eq.name,
              equipmentCode: eq.code,
              action: 'uso_evento' as const,
              userId: context.user?.sub,
              eventId: eventId,
              eventName: body.type,
              eventDate: eventStart,
              eventEndDate: eventEnd,
              eventLocation: body.lugar,
              eventClientName: body.fullName,
              details: `${isCurrentOrPast ? 'Agregado a' : 'Programado para'} ${body.type} - ${body.lugar}`
            }))
        );
      }

      // PASO 3: Equipos REMOVIDOS: sacar la reserva de este evento y liberar
      // los que figuraban "En Evento" sin otro uso hoy (nunca los dados de
      // baja / en reparación). Escrituras agrupadas (ver lib/equipmentRelease).
      if (removedEquipmentIds.length > 0) {
        const released = await releaseEquipmentFromEvent(db, removedEquipmentIds, eventId);
        const oldById = new Map(
          (oldEvent?.equipment || []).map((eq: any) => [eq._id.toString(), eq])
        );
        await createHistoryEntries(
          db,
          released
            .filter((r) => oldById.has(r._id.toString()))
            .map((r) => {
              const old: any = oldById.get(r._id.toString());
              return {
                equipmentId: r._id.toString(),
                equipmentName: old.name,
                equipmentCode: old.code,
                action: 'cambio_estado' as const,
                userId: context.user?.sub,
                fromValue: 'En Evento',
                toValue:
                  r.decision === 'active'
                    ? 'En Evento (otro)'
                    : r.decision === 'free'
                    ? 'Disponible'
                    : 'Sin cambios (fuera de servicio o ya disponible)',
                details: `Removido de ${oldEvent?.type} - ${oldEvent?.lugar}`
              };
            })
        );
      }
    }
    return NextResponse.json({ event: sanitizeEventForRole(event, context.role) }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'canEditEvents' });

// PATCH: Actualizar solo el orden de equipamiento (categorías y/o items dentro
// de cada categoría). Liviano, sin tocar equipos ni scheduledUses.
export const PATCH = withAuth(async (context: AuthContext, req: Request) => {
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const body = await req.json();
    const db = client.db('degano-app');

    const { eventId, equipmentCategoryOrder, equipmentItemOrder } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    // Setear solo los campos de orden que vengan en el body
    const update: Record<string, any> = { updatedAt: new Date() };
    if (Array.isArray(equipmentCategoryOrder)) {
      update.equipmentCategoryOrder = equipmentCategoryOrder;
    }
    if (equipmentItemOrder && typeof equipmentItemOrder === 'object') {
      update.equipmentItemOrder = equipmentItemOrder;
    }

    if (Object.keys(update).length === 1) {
      return NextResponse.json(
        { error: 'equipmentCategoryOrder or equipmentItemOrder is required' },
        { status: 400 }
      );
    }

    const event = await db
      .collection('events')
      .findOneAndUpdate(
        { _id: new ObjectId(eventId) },
        { $set: update },
        { returnDocument: 'after' }
      );

    return NextResponse.json({ event: sanitizeEventForRole(event, context.role) }, { status: 200 });
  } catch (error) {
    console.error('Error updating equipment order:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'canEditEvents' });
