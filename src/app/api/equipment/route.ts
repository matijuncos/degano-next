// equipment/route.ts
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { isDateBetweenInclusive } from '@/utils/dateUtils';
import { createHistoryEntry, detectEquipmentChanges, determineSpecialAction } from '@/utils/equipmentHistoryUtils';
import { getSession } from '@auth0/nextjs-auth0';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventStartDate = searchParams.get('eventStartDate');
  const eventEndDate = searchParams.get('eventEndDate');

  const client = await clientPromise;
  const db = client.db('degano-app');
  const equipments = await db
    .collection('equipment')
    .find()
    .sort({ name: 1 })
    .toArray();

  // Si hay fechas del evento, validar contra esas fechas
  // Si no, validar contra la fecha actual (modo visualización)
  const checkDate = eventStartDate ? new Date(eventStartDate) : new Date();

  const enriched = equipments.map((eq) => {
    // Si estamos validando para un evento específico, verificar si el equipo
    // está ocupado en TODO el rango de fechas del evento
    let inEvent = false;

    if (eventStartDate && eventEndDate && eq.lastUsedStartDate && eq.lastUsedEndDate) {
      const eStart = new Date(eventStartDate);
      const eEnd = new Date(eventEndDate);
      const usedStart = new Date(eq.lastUsedStartDate);
      const usedEnd = new Date(eq.lastUsedEndDate);

      // Resetear horas para comparar solo fechas
      eStart.setHours(0, 0, 0, 0);
      eEnd.setHours(0, 0, 0, 0);
      usedStart.setHours(0, 0, 0, 0);
      usedEnd.setHours(0, 0, 0, 0);

      // Verificar si hay solapamiento entre las fechas del evento y las fechas de uso
      // Solapamiento ocurre si: (eStart <= usedEnd) AND (eEnd >= usedStart)
      inEvent = eStart <= usedEnd && eEnd >= usedStart;
    } else {
      // Modo visualización: solo verificar si la fecha actual está en uso
      inEvent = isDateBetweenInclusive(
        checkDate,
        eq.lastUsedStartDate ? new Date(eq.lastUsedStartDate) : null,
        eq.lastUsedEndDate ? new Date(eq.lastUsedEndDate) : null
      );
    }

    const outOfServiceMasked = inEvent
      ? { isOut: true, reason: 'En Evento' }
      : eq.outOfService;

    return {
      ...eq,
      outOfService: outOfServiceMasked,
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const body = await req.json();
  const client = await clientPromise;
  const db = client.db('degano-app');
  const session = await getSession();

  const newEq = await db.collection('equipment').insertOne(body);

  const deltaAvailable = body.outOfService?.isOut ? 0 : 1;
  await db.collection('categories').updateOne(
    { _id: new ObjectId(String(body.categoryId)) },
    {
      $inc: {
        totalStock: 1,
        availableStock: deltaAvailable
      }
    }
  );

  // Registrar creación en historial
  await createHistoryEntry(db, {
    equipmentId: newEq.insertedId.toString(),
    equipmentName: body.name,
    equipmentCode: body.code,
    action: 'creacion',
    userId: session?.user?.sub,
    details: `Equipamiento creado: ${body.brand} ${body.model}`
  });

  return NextResponse.json({ ...body, _id: newEq.insertedId });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const client = await clientPromise;
  const db = client.db('degano-app');
  const session = await getSession();

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
    await db.collection('categories').updateOne(
      { _id: new ObjectId(String(rest.categoryId)) },
      {
        $inc: { availableStock: deltaAvailable }
      }
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
          userId: session?.user?.sub,
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
          userId: session?.user?.sub,
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
          userId: session?.user?.sub,
          changes: changes
        });
      }
    }
  }

  const updatedItem = await db
    .collection('equipment')
    .findOne({ _id: objectId });
  return NextResponse.json(updatedItem);
}

export async function DELETE(req: Request) {
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
    await db.collection('categories').updateOne(
      { _id: new ObjectId(String(equipment.categoryId)) },
      {
        $inc: {
          totalStock: -1,
          availableStock: deltaAvailable
        }
      }
    );
  }

  await db.collection('equipment').deleteOne({ _id: new ObjectId(id) });

  return NextResponse.json({ success: true });
}
