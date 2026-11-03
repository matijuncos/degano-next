export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { Db, ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { withAuth, AuthContext } from '@/lib/withAuth';
import { getPermissions } from '@/utils/roleUtils';
import { stripHistoryPrices, summarizeLife, parseHistoryNote } from '@/utils/equipmentLife';

// Historial PERMANENTE de los equipos: esta API solo lee y agrega notas.
// No hay forma de editar ni de borrar registros (ni acá ni en otro endpoint).

const HISTORY = 'equipmentHistory';

// PERF: el historial se consulta por equipo y fecha con el índice que ya existe
// en la base (equipmentId_1_date_-1). No se crea desde acá.

// Nombre de quien hizo cada cambio (el historial guarda el usuario del login;
// el vínculo con STAFF es interno y no sale de la API: solo el nombre)
async function userNames(db: Db): Promise<Map<string, string>> {
  const employees = await db
    .collection('employees')
    .find({ authSub: { $exists: true } }, { projection: { authSub: 1, fullName: 1 } })
    .toArray();
  return new Map(employees.map((e: any) => [String(e.authSub), e.fullName || '']));
}

/**
 * GET ?equipmentId=  → historial completo del equipo (1 request): registros,
 *   resumen de su vida y las notas viejas escritas a mano. Funciona aunque el
 *   equipo se haya eliminado (el historial queda).
 * GET ?deleted=1     → equipos eliminados que tienen historial.
 */
export const GET = withAuth(async (context: AuthContext, req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const client = await clientPromise;
    const db = client.db('degano-app');

    if (searchParams.get('deleted') === '1') return listDeleted(db);

    const equipmentId = searchParams.get('equipmentId');
    if (!equipmentId) {
      return NextResponse.json({ error: 'equipmentId is required' }, { status: 400 });
    }

    const [entries, equipment, events, names] = await Promise.all([
      db.collection(HISTORY).find({ equipmentId }).sort({ date: -1 }).toArray(),
      ObjectId.isValid(equipmentId)
        ? db.collection('equipment').findOne(
            { _id: new ObjectId(equipmentId) },
            { projection: { name: 1, code: 1, history: 1 } }
          )
        : null,
      db
        .collection('events')
        .find({ 'equipment._id': equipmentId }, { projection: { date: 1, type: 1, lugar: 1 } })
        .toArray(),
      userNames(db)
    ]);

    const canSeePrices = getPermissions(context.role).canViewEquipmentPrices;
    const withNames = entries.map((e: any) => {
      const { userId, ...rest } = e;
      const userName = rest.authorName || (userId && userId !== 'SYSTEM' ? names.get(String(userId)) : undefined);
      return { ...rest, _id: String(e._id), ...(userName ? { userName } : {}) };
    });
    const visible = canSeePrices ? withNames : stripHistoryPrices(withNames);

    // Equipo eliminado: nombre y código del último registro (la baja guarda una foto)
    const last = entries[0] as any;
    return NextResponse.json({
      equipment: {
        _id: equipmentId,
        name: equipment?.name ?? last?.equipmentName ?? 'Equipo',
        code: equipment?.code ?? last?.equipmentCode ?? '',
        deleted: !equipment,
        legacyNotes: typeof equipment?.history === 'string' ? equipment.history.trim() : ''
      },
      summary: summarizeLife(
        entries as any,
        events.map((ev: any) => ({ ...ev, _id: String(ev._id) })),
        new Date()
      ),
      entries: visible
    });
  } catch (error) {
    console.error('Error fetching equipment history:', error);
    return NextResponse.json({ error: 'Error al obtener el historial' }, { status: 500 });
  }
});

// PERF: primero los ids con historial (sale del índice, sin leer registros) y
// recién después se leen SOLO los registros de los equipos que ya no existen
async function listDeleted(db: Db) {
  const [historyIds, existing] = await Promise.all([
    db.collection(HISTORY).distinct('equipmentId'),
    db.collection('equipment').find({}, { projection: { _id: 1 } }).toArray()
  ]);
  const ids = new Set(existing.map((e: any) => String(e._id)));
  const deletedIds = historyIds.filter((id: any) => id && !ids.has(String(id)));
  if (!deletedIds.length) return NextResponse.json([]);
  const rows = await db
    .collection(HISTORY)
    .aggregate([
      { $match: { equipmentId: { $in: deletedIds } } },
      { $sort: { equipmentId: 1, date: -1 } },
      {
        $group: {
          _id: '$equipmentId',
          name: { $first: '$equipmentName' },
          code: { $first: '$equipmentCode' },
          lastDate: { $first: '$date' },
          entries: { $sum: 1 }
        }
      }
    ])
    .toArray();
  const deleted = rows
    .map((r: any) => ({ _id: String(r._id), name: r.name || 'Equipo', code: r.code || '', lastDate: r.lastDate, entries: r.entries }))
    .sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
  return NextResponse.json(deleted);
}

/**
 * POST { equipmentId, text } → agrega una NOTA a la bitácora del equipo
 * (reparaciones, observaciones…). Queda para siempre: no se edita ni se borra.
 */
export const POST = withAuth(async (context: AuthContext, req: Request) => {
  try {
    const body = await req.json();
    const text = parseHistoryNote(body?.text);
    if (!text) return NextResponse.json({ error: 'Escribí la nota' }, { status: 400 });
    const equipmentId = typeof body?.equipmentId === 'string' ? body.equipmentId : '';
    if (!ObjectId.isValid(equipmentId)) return NextResponse.json({ error: 'Equipo inválido' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db('degano-app');
    const equipment = await db
      .collection('equipment')
      .findOne({ _id: new ObjectId(equipmentId) }, { projection: { name: 1, code: 1 } });
    if (!equipment) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });

    const authorName = String(context.user?.name || context.user?.email || '').slice(0, 120);
    const entry = {
      equipmentId,
      equipmentName: equipment.name,
      equipmentCode: equipment.code,
      action: 'nota',
      date: new Date(),
      userId: context.user?.sub,
      note: text,
      ...(authorName ? { authorName } : {})
    };
    const { insertedId } = await db.collection(HISTORY).insertOne(entry);
    const { userId, ...publicEntry } = entry;
    return NextResponse.json(
      { ...publicEntry, _id: String(insertedId), ...(authorName ? { userName: authorName } : {}) },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating history note:', error);
    return NextResponse.json({ error: 'No se pudo guardar la nota' }, { status: 500 });
  }
}, { requiredPermission: 'canEditEquipment' });
