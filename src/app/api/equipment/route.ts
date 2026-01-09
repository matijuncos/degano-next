// equipment/route.ts
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { isDateBetweenInclusive } from '@/utils/dateUtils';
import { createHistoryEntry, detectEquipmentChanges, determineSpecialAction } from '@/utils/equipmentHistoryUtils';
import { withAuth, withAdminAuth, AuthContext } from '@/lib/withAuth';
import { getPermissions } from '@/utils/roleUtils';

// Función para actualizar el stock de todas las categorías padre
async function updateParentCategoriesStock(
  db: any,
  categoryId: string,
  totalStockDelta: number,
  availableStockDelta: number
) {
  let currentCategoryId: string | null = categoryId;

  while (currentCategoryId) {
    // Actualizar la categoría actual
    await db.collection('categories').updateOne(
      { _id: new ObjectId(currentCategoryId) },
      {
        $inc: {
          totalStock: totalStockDelta,
          availableStock: availableStockDelta
        }
      }
    );

    // Buscar el padre de la categoría actual
    const category: { parentId?: string | null } | null = await db
      .collection('categories')
      .findOne({ _id: new ObjectId(currentCategoryId) });

    // Si la categoría tiene un padre, continuar; si no, terminar
    currentCategoryId = category?.parentId || null;
  }
}

export const GET = withAuth(async (context: AuthContext, req: Request) => {
  const { searchParams } = new URL(req.url);
  const eventStartDate = searchParams.get('eventStartDate');
  const eventEndDate = searchParams.get('eventEndDate');

  const client = await clientPromise;
  const db = client.db('degano-app');

  // PASO 1: Limpiar scheduledUses expirados y actualizar estados (solo si NO estamos en modo evento)
  if (!eventStartDate && !eventEndDate) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Buscar equipos con scheduledUses
    const equipmentWithScheduled = await db
      .collection('equipment')
      .find({
        scheduledUses: { $exists: true, $ne: [] }
      })
      .toArray();

    for (const eq of equipmentWithScheduled) {
      const scheduledUses = eq.scheduledUses || [];

      // Filtrar usos que ya pasaron
      const activeUses = scheduledUses.filter((use: any) => {
        const endDate = new Date(use.endDate);
        endDate.setHours(0, 0, 0, 0);
        return endDate >= now;
      });

      const expiredUses = scheduledUses.filter((use: any) => {
        const endDate = new Date(use.endDate);
        endDate.setHours(0, 0, 0, 0);
        return endDate < now;
      });

      // Si hubo cambios (usos expirados), actualizar
      if (expiredUses.length > 0) {
        console.log(`=== LIMPIANDO ${expiredUses.length} USOS EXPIRADOS PARA: ${eq.name} ===`);

        // Verificar si el equipo está actualmente en uso
        const isCurrentlyInUse = activeUses.some((use: any) => {
          const startDate = new Date(use.startDate);
          const endDate = new Date(use.endDate);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
          return now >= startDate && now <= endDate;
        });

        // Actualizar scheduledUses y estado del equipo
        const updateData: any = {
          scheduledUses: activeUses
        };

        // Si ya no está en uso, limpiar estado
        if (!isCurrentlyInUse && eq.outOfService?.reason === 'En Evento') {
          updateData.location = 'Deposito';
          updateData.lastUsedStartDate = null;
          updateData.lastUsedEndDate = null;
          updateData.outOfService = {
            isOut: false,
            reason: null,
            details: null
          };

          // Registrar en historial
          await createHistoryEntry(db, {
            equipmentId: eq._id.toString(),
            equipmentName: eq.name,
            equipmentCode: eq.code,
            action: 'cambio_estado',
            userId: context.user?.sub || 'SYSTEM',
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
  }

  // PASO 2: Obtener equipos actualizados
  // Ordenar por createdAt (más recientes primero) y luego alfabéticamente por nombre
  const equipments = await db
    .collection('equipment')
    .find()
    .sort({ createdAt: -1, name: 1 })
    .toArray();

  // PASO 3: Si estamos en modo evento (crear/editar), aplicar máscara basada en scheduledUses
  const enriched = equipments.map((eq) => {
    // Si estamos validando para un evento específico (al crear/editar evento),
    // verificar si el equipo está ocupado en el rango de fechas
    if (eventStartDate && eventEndDate) {
      const eStart = new Date(eventStartDate);
      const eEnd = new Date(eventEndDate);
      eStart.setHours(0, 0, 0, 0);
      eEnd.setHours(0, 0, 0, 0);

      // Verificar conflictos con scheduledUses
      const scheduledUses = eq.scheduledUses || [];
      const hasConflict = scheduledUses.some((use: any) => {
        const usedStart = new Date(use.startDate);
        const usedEnd = new Date(use.endDate);
        usedStart.setHours(0, 0, 0, 0);
        usedEnd.setHours(0, 0, 0, 0);

        // Verificar si hay solapamiento entre las fechas del evento y las fechas de uso programado
        return eStart <= usedEnd && eEnd >= usedStart;
      });

      // Si hay conflicto, marcar como no disponible para este evento
      if (hasConflict) {
        return {
          ...eq,
          outOfService: { isOut: true, reason: 'En Evento' }
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

  const deltaAvailable = body.outOfService?.isOut ? 0 : 1;
  // Actualizar toda la jerarquía de categorías padre
  await updateParentCategoriesStock(
    db,
    body.categoryId,
    1, // Incrementar totalStock
    deltaAvailable // Incrementar availableStock (0 si está fuera de servicio)
  );

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
  const wasOut = oldItem?.outOfService?.isOut;
  const isOut = rest?.outOfService?.isOut;

  await db.collection('equipment').updateOne({ _id: objectId }, { $set: rest });

  let deltaAvailable = 0;
  if (wasOut !== isOut) {
    deltaAvailable = wasOut && !isOut ? 1 : !wasOut && isOut ? -1 : 0;
  }

  if (deltaAvailable !== 0) {
    // Actualizar toda la jerarquía de categorías padre
    await updateParentCategoriesStock(
      db,
      rest.categoryId,
      0, // No cambia totalStock en una edición
      deltaAvailable // Solo cambia availableStock si cambió el estado
    );
  }

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

  const equipment = await db
    .collection('equipment')
    .findOne({ _id: new ObjectId(id) });
  if (equipment) {
    const deltaAvailable = equipment.outOfService?.isOut ? 0 : -1;
    // Actualizar toda la jerarquía de categorías padre
    await updateParentCategoriesStock(
      db,
      equipment.categoryId,
      -1, // Decrementar totalStock
      deltaAvailable // Decrementar availableStock (0 si estaba fuera de servicio)
    );
  }

  await db.collection('equipment').deleteOne({ _id: new ObjectId(id) });

  return NextResponse.json({ success: true });
}, { requiredPermission: 'canDeleteEquipment' });
