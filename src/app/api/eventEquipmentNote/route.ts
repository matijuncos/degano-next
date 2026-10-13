import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { withManagerAuth, AuthContext } from '@/lib/withAuth';
import { normalizeEquipmentNote } from '@/utils/equipmentNotes';

// Nota de UN equipo dentro de UN evento (events.equipment[].note).
// Actualiza solo esa nota, de forma atómica: no reenvía el array de equipos,
// así no pisa cambios hechos en otro lado ni toca reservas (scheduledUses).
export const PUT = withManagerAuth(async (_context: AuthContext, req: Request) => {
  try {
    const { eventId, equipmentId, note } = await req.json();
    if (!eventId || !ObjectId.isValid(String(eventId)) || !equipmentId) {
      return NextResponse.json({ error: 'Faltan datos del evento o del equipo' }, { status: 400 });
    }
    if (note != null && typeof note !== 'string') {
      return NextResponse.json({ error: 'La nota tiene que ser texto' }, { status: 400 });
    }

    const text = normalizeEquipmentNote(note);
    const client = await clientPromise;
    const db = client.db('degano-app');

    const event = await db.collection('events').findOneAndUpdate(
      { _id: new ObjectId(String(eventId)), 'equipment._id': String(equipmentId) },
      text
        ? { $set: { 'equipment.$[eq].note': text, updatedAt: new Date() } }
        : { $unset: { 'equipment.$[eq].note': '' }, $set: { updatedAt: new Date() } },
      { arrayFilters: [{ 'eq._id': String(equipmentId) }], returnDocument: 'after' }
    );

    if (!event) {
      return NextResponse.json(
        { error: 'El equipo ya no está en este evento. Actualizá la página.' },
        { status: 404 }
      );
    }
    return NextResponse.json({ event });
  } catch (error) {
    console.error('[eventEquipmentNote PUT]', error);
    return NextResponse.json({ error: 'Error al guardar la nota' }, { status: 500 });
  }
});
