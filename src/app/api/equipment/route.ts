// equipment/route.ts
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { isDateBetweenInclusive } from '@/utils/dateUtils';
import { createHistoryEntry, detectEquipmentChanges, determineSpecialAction } from '@/utils/equipmentHistoryUtils';
import { withAuth, withAdminAuth, AuthContext } from '@/lib/withAuth';
import { getPermissions } from '@/utils/roleUtils';

// Función de cleanup en background (no bloquea la respuesta)
async function cleanupExpiredScheduledUses(db: any, userId: string) {
  try {
    const now = new Date();

    const equipmentWithScheduled = await db
      .collection('equipment')
      .find({
        scheduledUses: { $exists: true, $ne: [] }
      })
      .toArray();

    for (const eq of equipmentWithScheduled) {
      const scheduledUses = eq.scheduledUses || [];

      const activeUses = scheduledUses.filter((use: any) => {
        const endDate = new Date(use.endDate);
        return endDate >= now;
      });

      const expiredUses = scheduledUses.filter((use: any) => {
        const endDate = new Date(use.endDate);
        return endDate < now;
      });

      if (expiredUses.length > 0) {
        const isCurrentlyInUse = activeUses.some((use: any) => {
          const startDate = new Date(use.startDate);
          const endDate = new Date(use.endDate);
          return now >= startDate && now <= endDate;
        });

        const updateData: any = {
          scheduledUses: activeUses
        };

        if (!isCurrentlyInUse && eq.outOfService?.reason === 'En Evento') {
          updateData.location = 'Deposito';
          updateData.lastUsedStartDate = null;
          updateData.lastUsedEndDate = null;
          updateData.outOfService = {
            isOut: false,
            reason: null,
            details: null
          };

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

        await db.collection('equipment').updateOne(
          { _id: eq._id },
          { $set: updateData }
        );
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

  const client = await clientPromise;
  const db = client.db('degano-app');

  // Cleanup en background (no bloquea la respuesta) - solo cuando NO estamos en modo evento
  if (!eventStartDate && !eventEndDate) {
    cleanupExpiredScheduledUses(db, context.user?.sub || 'SYSTEM');
  }

  // Obtener equipos
  const equipments = await db
    .collection('equipment')
    .find()
    .sort({ createdAt: 1, name: 1 })
    .toArray();

  // PASO 3: Si estamos en modo evento (crear/editar), aplicar máscara basada en scheduledUses
  const enriched = equipments.map((eq) => {
    // Si estamos validando para un evento específico (al crear/editar evento),
    // verificar si el equipo está ocupado en el rango de fechas
    if (eventStartDate && eventEndDate) {
      const eStart = new Date(eventStartDate);
      const eEnd = new Date(eventEndDate);

      // Verificar conflictos con scheduledUses (comparando datetime exacto con hora)
      const scheduledUses = eq.scheduledUses || [];
      const hasConflict = scheduledUses.some((use: any) => {
        const usedStart = new Date(use.startDate);
        const usedEnd = new Date(use.endDate);

        // Solapamiento real: el nuevo evento empieza antes de que termine el uso, y termina después de que empieza
        return eStart < usedEnd && eEnd > usedStart;
      });

      // Si hay conflicto, marcar como no disponible para este evento
      if (hasConflict) {
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

    // Devolver el equipamiento tal cual está en la DB
    return eq;
  });

  return NextResponse.json(enriched, {
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

  const { _id, ...rest } = body;
  const objectId = new ObjectId(String(_id));

  const oldItem = await db.collection('equipment').findOne({ _id: objectId });

  await db.collection('equipment').updateOne({ _id: objectId }, { $set: rest });

  // Detectar cambios y registrar en historial
  if (oldItem) {
    const changes = detectEquipmentChanges(oldItem, rest);

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
  return NextResponse.json(updatedItem);
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
