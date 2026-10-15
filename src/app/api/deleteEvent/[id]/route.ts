import clientPromise from '@/lib/mongodb';
import { MongoClient, ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/withAuth';
import { createHistoryEntries } from '@/utils/equipmentHistoryUtils';
import { releaseEquipmentFromEvent } from '@/lib/equipmentRelease';

// Solo admin y manager pueden eliminar eventos
export const DELETE = withAuth(
  async (context: AuthContext, request: Request, { params }: { params: { id: string } }) => {
  const eventId = params.id;
  if (!eventId) {
    return NextResponse.json(
      { message: 'Event ID is missing', success: false },
      { status: 400 }
    );
  }
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const db = client.db('degano-app');
    // PASO 1: Obtener el evento ANTES de eliminarlo para conocer los equipos asignados
    const event = await db
      .collection('events')
      .findOne({ _id: new ObjectId(eventId) });

    if (!event) {
      return NextResponse.json(
        { message: 'Event not found', success: false },
        { status: 404 }
      );
    }

    const eventEquipmentIds = (event.equipment || []).map((eq: any) => eq._id.toString());

    // PASO 2: Eliminar el evento
    await db
      .collection('events')
      .deleteOne({ _id: new ObjectId(eventId) });

    // PASO 3: Sacar la reserva de este evento de todos sus equipos y liberar
    // los que figuraban "En Evento" sin otro uso hoy (nunca los dados de baja /
    // en reparación). Escrituras agrupadas (ver lib/equipmentRelease).
    if (eventEquipmentIds.length > 0) {
      const released = await releaseEquipmentFromEvent(db, eventEquipmentIds, eventId);
      await createHistoryEntries(
        db,
        released
          .filter((r) => r.decision === 'free')
          .map((r) => ({
            equipmentId: r._id.toString(),
            equipmentName: r.name || '',
            equipmentCode: r.code || '',
            action: 'cambio_estado' as const,
            userId: context.user?.sub || 'SYSTEM',
            fromValue: 'En Evento',
            toValue: 'Disponible',
            details: `Liberado automáticamente - evento "${event.type || event.name}" eliminado`
          }))
      );
    }

    return NextResponse.json({
      message: 'Event deleted successfully',
      success: true
    });
  } catch (error) {
    return NextResponse.json(
      { message: error, success: false },
      { status: 500 }
    );
  }
  },
  { requiredPermission: 'canDeleteEvents' }
);
