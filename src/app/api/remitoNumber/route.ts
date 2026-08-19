import { MongoClient, ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';

export const dynamic = 'force-dynamic';

// Punto de venta fijo del remito (parte izquierda del número: "0001 - ...")
const PUNTO_VENTA = '0001';

// Formatea el número de remito: seq 97 → "0001 - 00000097"
const formatRemitoNumber = (seq: number) =>
  `${PUNTO_VENTA} - ${String(seq).padStart(8, '0')}`;

// Devuelve el número de remito de un evento. Si ya tiene uno asignado lo
// reutiliza (idempotente por evento); si no, incrementa el contador atómico
// (colección `counters`, doc `remito`) y lo persiste en el evento.
export const POST = withAuth(async (_context, req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
    }

    const client = (await clientPromise) as MongoClient;
    const db = client.db('degano-app');
    const events = db.collection('events');

    const event = await events.findOne(
      { _id: new ObjectId(eventId) },
      { projection: { remitoNumber: 1 } }
    );
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Ya tiene número → reutilizar
    if (event.remitoNumber) {
      return NextResponse.json({ remitoNumber: event.remitoNumber });
    }

    // Incremento atómico del contador (upsert si no existe todavía)
    const counter = await db.collection('counters').findOneAndUpdate(
      { _id: 'remito' as any },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    const seq = (counter as any)?.seq ?? 1;
    const remitoNumber = formatRemitoNumber(seq);

    // Persistir en el evento para reutilizarlo en próximas impresiones
    await events.updateOne(
      { _id: new ObjectId(eventId) },
      { $set: { remitoNumber } }
    );

    return NextResponse.json({ remitoNumber });
  } catch (error) {
    console.error('Error en remitoNumber:', error);
    return NextResponse.json(
      { error: 'Error generando número de remito' },
      { status: 500 }
    );
  }
});
