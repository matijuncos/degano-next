import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { withAuth, withAdminAuth, AuthContext } from '@/lib/withAuth';
import { ObjectId } from 'mongodb';
import { normalizeMapsUrl, MAPS_URL_ERROR } from '@/utils/mapsUtils';
import {
  arTodayStart,
  eventSetFromSalon,
  eventSetFromSalonChange,
  normalizeVenueText,
  parseSalonInput,
  possibleDuplicates,
  summarizeVenueUsage,
  venueNameFilter
} from '@/utils/venues';
import { applyVenueToUpcomingEvents } from '@/lib/venueUpdate';

export const dynamic = 'force-dynamic';

// Panel de Lugares: cuántos eventos tiene cada lugar (total y de hoy en
// adelante), lugares usados en eventos que no tienen ficha y posibles duplicados.
// Una sola agregación sobre events (solo `lugar` y `date`).
async function venueUsage(db: any, salons: any[]) {
  const start = arTodayStart(new Date());
  const rows = await db
    .collection('events')
    .aggregate([
      { $project: { lugar: 1, d: { $convert: { input: '$date', to: 'date', onError: null, onNull: null } } } },
      {
        $group: {
          _id: '$lugar',
          total: { $sum: 1 },
          upcoming: { $sum: { $cond: [{ $gte: ['$d', start] }, 1, 0] } }
        }
      }
    ])
    .toArray();
  const plain = salons.map((s) => ({ _id: String(s._id), name: s.name }));
  const { usage, orphans } = summarizeVenueUsage(
    rows.map((r: any) => ({ lugar: r._id, total: r.total, upcoming: r.upcoming })),
    plain
  );
  return { usage, orphans, duplicates: [...possibleDuplicates(plain)] };
}

// ¿Otro lugar ya tiene ese nombre? (mismo criterio que con los eventos)
const findByName = (db: any, name: string, exceptId?: string) =>
  db.collection('salons').findOne({
    name: venueNameFilter(name),
    ...(exceptId ? { _id: { $ne: new ObjectId(exceptId) } } : {})
  });

export const GET = withAuth(async (context: AuthContext, req: Request) => {
  try {
    const client = await clientPromise;
    const db = client.db('degano-app');

    const salons = await db
      .collection('salons')
      .find()
      .sort({ name: 1 })
      .toArray();
    const withUsage = new URL(req.url).searchParams.get('withUsage') === '1';

    return NextResponse.json(
      { salons, ...(withUsage ? await venueUsage(db, salons) : {}) },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching salons:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});

export const POST = withAdminAuth(async (context: AuthContext, req: Request) => {
  try {
    const body = await req.json();
    if (body?.action === 'merge') return mergeSalons(context, body);
    const { city, address, contactName, contactPhone, province } = body;
    const name = normalizeVenueText(body.name, 120);

    if (!name) {
      return NextResponse.json(
        { error: 'Salon name is required' },
        { status: 400 }
      );
    }

    const mapsUrl = normalizeMapsUrl(body.mapsUrl);
    if (mapsUrl === null) {
      return NextResponse.json({ error: MAPS_URL_ERROR }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('degano-app');

    // Verificar si el salón ya existe
    const existingSalon = await db
      .collection('salons')
      .findOne({ name: venueNameFilter(name) });

    if (existingSalon) {
      // Desde el panel de Lugares es un error (no se crea otro con el mismo
      // nombre); desde el formulario del evento se reutiliza el existente
      if (body.strict) {
        return NextResponse.json({ error: `Ya existe el lugar "${existingSalon.name}"` }, { status: 409 });
      }
      return NextResponse.json(
        { salon: existingSalon },
        { status: 200 }
      );
    }

    // Crear nuevo salón
    const newSalon = {
      name,
      city: city || '',
      province: province || '',
      address: address || '',
      contactName: contactName || '',
      contactPhone: contactPhone || '',
      mapsUrl,
      createdAt: new Date()
    };

    const result = await db.collection('salons').insertOne(newSalon);

    return NextResponse.json(
      { salon: { ...newSalon, _id: result.insertedId } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating salon:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (context: AuthContext, req: Request) => {
  try {
    const body = await req.json();
    const { _id, name, city, address, contactName, contactPhone, province } = body;

    if (!_id) {
      return NextResponse.json(
        { error: 'Salon ID is required' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Salon name is required' },
        { status: 400 }
      );
    }

    // mapsUrl solo se toca si viene en el body (no borrar por ausencia de la clave)
    let mapsUrlUpdate: { mapsUrl?: string } = {};
    if ('mapsUrl' in body) {
      const mapsUrl = normalizeMapsUrl(body.mapsUrl);
      if (mapsUrl === null) {
        return NextResponse.json({ error: MAPS_URL_ERROR }, { status: 400 });
      }
      mapsUrlUpdate = { mapsUrl };
    }

    const client = await clientPromise;
    const db = client.db('degano-app');

    // Desde el panel de Lugares: datos normalizados, nombre único y el cambio
    // se aplica a los eventos de HOY EN ADELANTE
    if (body.propagate === true) {
      return updateFromPanel(db, context, body, mapsUrlUpdate);
    }

    // Actualizar el salón
    const result = await db.collection('salons').updateOne(
      { _id: new ObjectId(_id) },
      {
        $set: {
          name,
          city: city || '',
          province: province || '',
          address: address || '',
          contactName: contactName || '',
          contactPhone: contactPhone || '',
          ...mapsUrlUpdate,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Salon not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Salon updated successfully',
        modifiedCount: result.modifiedCount
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating salon:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'canEditSalons' });

// Cambia SOLO el link de Google Maps del salón (lo usa el botón "Eliminar" del
// formulario de evento). No recibe ni toca ningún otro campo del salón.
export const PATCH = withAuth(async (context: AuthContext, req: Request) => {
  try {
    const body = await req.json();
    const { _id } = body;

    if (!_id || !ObjectId.isValid(_id)) {
      return NextResponse.json(
        { error: 'Salon ID is required' },
        { status: 400 }
      );
    }
    if (!('mapsUrl' in body)) {
      return NextResponse.json(
        { error: 'mapsUrl is required' },
        { status: 400 }
      );
    }

    const mapsUrl = normalizeMapsUrl(body.mapsUrl);
    if (mapsUrl === null) {
      return NextResponse.json({ error: MAPS_URL_ERROR }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('degano-app');

    const result = await db.collection('salons').updateOne(
      { _id: new ObjectId(_id) },
      { $set: { mapsUrl, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    return NextResponse.json({ mapsUrl }, { status: 200 });
  } catch (error) {
    console.error('Error updating salon maps url:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'canEditSalons' });

async function updateFromPanel(db: any, context: AuthContext, body: any, mapsUrlUpdate: { mapsUrl?: string }) {
  // El panel de Lugares lo modifica SOLO el admin (el manager solo lo ve)
  if (context.role !== 'admin') {
    return NextResponse.json({ error: 'Solo un administrador puede modificar lugares' }, { status: 403 });
  }
  if (!ObjectId.isValid(String(body._id))) {
    return NextResponse.json({ error: 'Lugar inválido' }, { status: 400 });
  }
  const parsed = parseSalonInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const next = { ...parsed.value, ...mapsUrlUpdate };

  const prev = await db.collection('salons').findOne({ _id: new ObjectId(String(body._id)) });
  if (!prev) return NextResponse.json({ error: 'Lugar no encontrado' }, { status: 404 });
  if (next.name !== prev.name) {
    const other = await findByName(db, next.name, String(prev._id));
    if (other) {
      return NextResponse.json(
        { error: `Ya existe el lugar "${other.name}". Si es el mismo, usá "Unir con otro lugar".` },
        { status: 409 }
      );
    }
  }

  const now = new Date();
  await db.collection('salons').updateOne({ _id: prev._id }, { $set: { ...next, updatedAt: now } });
  const { eventsUpdated } = await applyVenueToUpcomingEvents(
    db,
    prev.name,
    eventSetFromSalonChange(prev, next),
    now,
    context.user?.sub
  );
  return NextResponse.json({ salon: { ...prev, ...next, updatedAt: now }, eventsUpdated });
}

// Unir dos lugares que son el mismo (SOLO ADMIN): los eventos de hoy en
// adelante del que se va pasan al que queda (con todos sus datos) y se borra
// la ficha duplicada. Los eventos pasados conservan el nombre que tenían.
async function mergeSalons(context: AuthContext, body: any) {
  const { sourceId, targetId } = body;
  if (!ObjectId.isValid(String(sourceId)) || !ObjectId.isValid(String(targetId)) || sourceId === targetId) {
    return NextResponse.json({ error: 'Elegí dos lugares distintos' }, { status: 400 });
  }
  const client = await clientPromise;
  const db = client.db('degano-app');
  const [source, target] = await Promise.all([
    db.collection('salons').findOne({ _id: new ObjectId(String(sourceId)) }),
    db.collection('salons').findOne({ _id: new ObjectId(String(targetId)) })
  ]);
  if (!source || !target) return NextResponse.json({ error: 'Lugar no encontrado' }, { status: 404 });

  const { eventsUpdated } = await applyVenueToUpcomingEvents(
    db,
    source.name,
    eventSetFromSalon(target as any),
    new Date(),
    context.user?.sub
  );
  await db.collection('salons').deleteOne({ _id: source._id });
  return NextResponse.json({ eventsUpdated });
}
