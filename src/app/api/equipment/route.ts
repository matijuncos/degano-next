// equipment/route.ts
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { sortByName } from '@/utils/sortByName';
import { ObjectId } from 'mongodb';
import { isDateBetweenInclusive } from '@/utils/dateUtils';
import { createHistoryEntry, detectEquipmentChanges, determineSpecialAction } from '@/utils/equipmentHistoryUtils';
import { withAuth, withAdminAuth, AuthContext } from '@/lib/withAuth';
import { getPermissions } from '@/utils/roleUtils';
import {
  conflictingUses,
  usesInProgress,
  ghostEventIdToIgnore,
  ScheduledUse,
  BusyUse
} from '@/utils/equipmentAvailability';
import { stripPriceFields, PRICE_FIELDS } from '@/utils/equipmentPrices';

// Función de cleanup en background (no bloquea la respuesta).
// IMPORTANTE: todas las escrituras son atómicas en Mongo ($pull / update
// condicional). NUNCA reescribir `scheduledUses` con una copia leída antes:
// si en el medio se crea/edita un evento, esa copia vieja pisa sus reservas
// (así aparecieron reservas fantasma y reservas faltantes).
async function cleanupExpiredScheduledUses(db: any, userId: string) {
  try {
    const now = new Date();
    const equipmentCol = db.collection('equipment');

    // Equipos con al menos una reserva vencida
    const expired = await equipmentCol
      .find({ 'scheduledUses.endDate': { $lt: now } })
      .project({ _id: 1 })
      .toArray();
    if (expired.length === 0) return;
    const expiredIds = expired.map((eq: any) => eq._id);

    // Quitar solo las reservas vencidas; las demás no se tocan
    await equipmentCol.updateMany(
      { _id: { $in: expiredIds } },
      { $pull: { scheduledUses: { endDate: { $lt: now } } } }
    );

    // Liberar los que figuran "En Evento" y no tienen un uso en curso ahora.
    // La condición va en el mismo update: si justo se les asignó un evento
    // en curso, no se liberan.
    const notInUseNow = {
      'outOfService.reason': 'En Evento',
      scheduledUses: {
        $not: { $elemMatch: { startDate: { $lte: now }, endDate: { $gte: now } } }
      }
    };
    const toRelease = await equipmentCol
      .find({ _id: { $in: expiredIds }, ...notInUseNow })
      .project({ _id: 1, name: 1, code: 1 })
      .toArray();

    for (const eq of toRelease) {
      const res = await equipmentCol.updateOne(
        { _id: eq._id, ...notInUseNow },
        {
          $set: {
            location: 'Deposito',
            lastUsedStartDate: null,
            lastUsedEndDate: null,
            outOfService: { isOut: false, reason: null, details: null }
          }
        }
      );
      if (res.modifiedCount > 0) {
        await createHistoryEntry(db, {
          equipmentId: eq._id.toString(),
          equipmentName: eq.name,
          equipmentCode: eq.code,
          action: 'cambio_estado',
          userId: userId || 'SYSTEM',
          fromValue: 'En Evento',
          toValue: 'Disponible',
          details: `Liberado automáticamente - evento finalizado`
        });
      }
    }
  } catch (error) {
    console.error('[cleanupExpiredScheduledUses] Error:', error);
  }
}

export const GET = withAuth(async (context: AuthContext, req: Request) => {
  const { searchParams } = new URL(req.url);
  const eventStartDate = searchParams.get('eventStartDate');
  const eventEndDate = searchParams.get('eventEndDate');
  // Evento que se está editando (opcional): sus reservas fantasma no bloquean
  const excludeEventIdParam = searchParams.get('excludeEventId');
  const excludeEventId =
    excludeEventIdParam && ObjectId.isValid(excludeEventIdParam)
      ? excludeEventIdParam
      : null;

  const client = await clientPromise;
  const db = client.db('degano-app');

  // Cleanup en background (no bloquea la respuesta) - solo cuando NO estamos en modo evento
  if (!eventStartDate && !eventEndDate) {
    cleanupExpiredScheduledUses(db, context.user?.sub || 'SYSTEM');
  }

  // Obtener equipos (y, si hay evento a excluir, sus equipos guardados) en paralelo
  const [rawEquipments, editedEvent] = await Promise.all([
    db.collection('equipment').find().toArray(),
    excludeEventId && eventStartDate && eventEndDate
      ? db
          .collection('events')
          .findOne(
            { _id: new ObjectId(excludeEventId) },
            { projection: { 'equipment._id': 1 } }
          )
      : null
  ]);
  const equipments = sortByName(rawEquipments);
  const savedEventEquipmentIds = new Set<string>(
    (editedEvent?.equipment || []).map((e: any) => String(e._id))
  );
  // Si el evento no existe no se ignora nada
  const ignoreEventId = editedEvent ? excludeEventId : null;

  // Reservas que ocupan cada equipo "En Uso" (para el modal "¿Dónde está en uso?")
  const busyByEq = new Map<string, ScheduledUse[]>();
  const now = new Date();

  // PASO 3: Si estamos en modo evento (crear/editar), aplicar máscara basada en scheduledUses
  const enriched = equipments.map((eq) => {
    // Si estamos validando para un evento específico (al crear/editar evento),
    // verificar si el equipo está ocupado en el rango de fechas
    if (eventStartDate && eventEndDate) {
      const eStart = new Date(eventStartDate);
      const eEnd = new Date(eventEndDate);

      // Verificar conflictos con scheduledUses (comparando datetime exacto con hora).
      // La regla de solapamiento vive en utils/equipmentAvailability (testeada).
      const conflicts = conflictingUses(eStart, eEnd, eq.scheduledUses, {
        ignoreEventId: ghostEventIdToIgnore(
          String(eq._id),
          ignoreEventId,
          savedEventEquipmentIds
        )
      });

      // Si hay conflicto, marcar como no disponible para este evento
      if (conflicts.length > 0) {
        busyByEq.set(String(eq._id), conflicts);
        return {
          ...eq,
          outOfService: { isOut: true, reason: 'En Evento' }
        };
      }

      // Si NO hay conflicto pero el equipo está marcado como "En Evento" en la DB,
      // mostrarlo como disponible para esta fecha (su uso actual no afecta la fecha solicitada)
      if (eq.outOfService?.isOut && eq.outOfService?.reason === 'En Evento') {
        return {
          ...eq,
          outOfService: { isOut: false, reason: null, details: null }
        };
      }
    }

    // Vista general: "En Uso" = estado de la DB; se muestran las reservas en curso
    if (
      !(eventStartDate && eventEndDate) &&
      eq.outOfService?.isOut &&
      eq.outOfService?.reason === 'En Evento'
    ) {
      busyByEq.set(String(eq._id), usesInProgress(eq.scheduledUses, now));
    }

    // Devolver el equipamiento tal cual está en la DB
    return eq;
  });

  // Nombre del cliente de cada evento involucrado: UNA consulta para todos
  const busyEventIds = Array.from(
    new Set(
      Array.from(busyByEq.values())
        .flat()
        .map((u) => String(u.eventId))
        .filter((id) => ObjectId.isValid(id))
    )
  );
  const clientByEvent = new Map<string, string>();
  if (busyEventIds.length > 0) {
    const evs = await db
      .collection('events')
      .find(
        { _id: { $in: busyEventIds.map((id) => new ObjectId(id)) } },
        { projection: { fullName: 1 } }
      )
      .toArray();
    evs.forEach((e: any) => clientByEvent.set(String(e._id), e.fullName || ''));
  }

  const withBusy = enriched.map((eq: any) => {
    const uses = busyByEq.get(String(eq._id));
    if (!uses) return eq;
    const busyWith: BusyUse[] = uses.map((u) => ({
      eventId: String(u.eventId),
      eventType: u.eventType || u.eventName,
      clientName: clientByEvent.get(String(u.eventId)) || undefined,
      location: u.location,
      startDate: new Date(u.startDate).toISOString(),
      endDate: new Date(u.endDate).toISOString()
    }));
    return { ...eq, busyWith };
  });

  // Precios: solo admin. A los demás no les llegan (regla de ofuscación).
  const canViewPrices = getPermissions(context.role).canViewEquipmentPrices;
  const response = canViewPrices ? withBusy : withBusy.map(stripPriceFields);

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
});

export const POST = withAdminAuth(async (context: AuthContext, req: Request) => {
  const body = await req.json();
  const client = await clientPromise;
  const db = client.db('degano-app');

  // Agregar timestamp de creación
  const equipmentData = {
    ...body,
    createdAt: new Date()
  };

  const newEq = await db.collection('equipment').insertOne(equipmentData);

  // Registrar creación en historial
  await createHistoryEntry(db, {
    equipmentId: newEq.insertedId.toString(),
    equipmentName: body.name,
    equipmentCode: body.code,
    action: 'creacion',
    userId: context.user?.sub,
    details: `Equipamiento creado: ${body.brand} ${body.model}`
  });

  return NextResponse.json({ ...equipmentData, _id: newEq.insertedId });
});

export const PUT = withAuth(async (context: AuthContext, req: Request) => {
  const body = await req.json();
  const client = await clientPromise;
  const db = client.db('degano-app');

  // `scheduledUses` lo manejan solo los endpoints de eventos: si viniera en el
  // body (copia vieja de la caché) pisaría reservas reales.
  // `busyWith` es calculado por el GET, tampoco se guarda.
  const { _id, scheduledUses: _ignored, busyWith: _busy, ...rest } = body;
  const objectId = new ObjectId(String(_id));

  // Precios: quien no los puede ver tampoco los puede pisar (su formulario
  // los manda vacíos porque nunca le llegaron).
  const canViewPrices = getPermissions(context.role).canViewEquipmentPrices;
  if (!canViewPrices) for (const f of PRICE_FIELDS) delete rest[f];

  const oldItem = await db.collection('equipment').findOne({ _id: objectId });

  await db.collection('equipment').updateOne({ _id: objectId }, { $set: rest });

  // Detectar cambios y registrar en historial
  if (oldItem) {
    // Sin permiso de precios, los precios no cambiaron: comparar con los viejos
    const compared = canViewPrices
      ? rest
      : { ...rest, rentalPrice: oldItem.rentalPrice, investmentPrice: oldItem.investmentPrice };
    const changes = detectEquipmentChanges(oldItem, compared);

    if (changes.length > 0) {
      const specialAction = determineSpecialAction(changes);

      if (specialAction === 'traslado') {
        // Registrar traslado
        const locationChange = changes.find((c) => c.field === 'location');
        await createHistoryEntry(db, {
          equipmentId: _id,
          equipmentName: rest.name,
          equipmentCode: rest.code,
          action: 'traslado',
          userId: context.user?.sub,
          fromValue: locationChange?.oldValue,
          toValue: locationChange?.newValue,
          details: `Trasladado de ${locationChange?.oldValue || 'sin ubicación'} a ${locationChange?.newValue}`
        });
      } else if (specialAction === 'cambio_estado') {
        // Registrar cambio de estado
        const stateChange = changes.find((c) => c.field === 'outOfService.isOut');
        await createHistoryEntry(db, {
          equipmentId: _id,
          equipmentName: rest.name,
          equipmentCode: rest.code,
          action: 'cambio_estado',
          userId: context.user?.sub,
          fromValue: stateChange?.oldValue ? 'Fuera de servicio' : 'Disponible',
          toValue: stateChange?.newValue ? 'Fuera de servicio' : 'Disponible',
          details: rest.outOfService?.reason || 'Sin motivo especificado'
        });
      } else {
        // Registrar edición normal
        await createHistoryEntry(db, {
          equipmentId: _id,
          equipmentName: rest.name,
          equipmentCode: rest.code,
          action: 'edicion',
          userId: context.user?.sub,
          changes: changes
        });
      }
    }
  }

  const updatedItem = await db
    .collection('equipment')
    .findOne({ _id: objectId });
  return NextResponse.json(updatedItem && !canViewPrices ? stripPriceFields(updatedItem) : updatedItem);
}, { requiredPermission: 'canEditEquipment' });

export const DELETE = withAuth(async (context: AuthContext, req: Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db('degano-app');

  await db.collection('equipment').deleteOne({ _id: new ObjectId(id) });

  return NextResponse.json({ success: true });
}, { requiredPermission: 'canDeleteEquipment' });
