import clientPromise from '@/lib/mongodb';
import { MongoClient, ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/withAuth';
import { createHistoryEntry } from '@/utils/equipmentHistoryUtils';

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

    // PASO 3: Limpiar scheduledUses de los equipos que estaban en el evento
    if (eventEquipmentIds.length > 0) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // Remover el scheduledUse de este evento de todos los equipos
      await db.collection('equipment').updateMany(
        { _id: { $in: eventEquipmentIds.map((id: string) => new ObjectId(id)) } },
        {
          $pull: { scheduledUses: { eventId: eventId } }
        }
      );

      // PASO 4: Verificar cada equipo para ver si debe volver a estado disponible
      for (const eqId of eventEquipmentIds) {
        const equipment = await db.collection('equipment').findOne({
          _id: new ObjectId(eqId)
        });

        if (equipment) {
          // Verificar si tiene otros eventos activos
          const hasActiveUse = (equipment.scheduledUses || []).some((use: any) => {
            const startDate = new Date(use.startDate);
            const endDate = new Date(use.endDate);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            return now >= startDate && now <= endDate;
          });

          // Si no tiene otros eventos activos, limpiar estado
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

            // Registrar en historial
            await createHistoryEntry(db, {
              equipmentId: eqId,
              equipmentName: equipment.name,
              equipmentCode: equipment.code,
              action: 'cambio_estado',
              userId: context.user?.sub || 'SYSTEM',
              fromValue: 'En Evento',
              toValue: 'Disponible',
              details: `Liberado automáticamente - evento "${event.type || event.name}" eliminado`
            });
        }
      }
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
