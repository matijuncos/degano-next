// src/app/api/equipment/bulkPrice/route.ts
// Aumento masivo de precios de equipamiento + deshacer el último. SOLO admin.
// - POST { action: 'apply', changes: [{ _id, rentalPrice?, investmentPrice?, expected }], description }
//   El precio ANTERIOR se toma de la base (nunca del cliente) y tiene que ser el
//   que vio la vista previa (`expected`); si alguno cambió → 409 y no se toca nada.
//   Solo se tocan precios que el equipo ya tenía (no se inventan). Orden:
//   1) lote `pending` en `price_batches` (para poder deshacer aunque algo falle)
//   2) escritura en lote, con el precio anterior en el filtro
//   3) historial `edicion` SOLO de lo que de verdad se escribió (lo ve solo el admin)
//   4) lote `applied`
// - POST { action: 'undo' } → deshace el último lote: vuelve al precio anterior
//   solo lo que sigue con el precio del aumento (lo editado después no se pisa).
//   El lote se toma de forma atómica: dos "Deshacer" a la vez no duplican el historial.
// - GET → resumen del último lote (para el botón Deshacer).
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise, { DB_NAME } from '@/lib/mongodb';
import { withAdminAuth, AuthContext } from '@/lib/withAuth';
import { createHistoryEntries } from '@/utils/equipmentHistoryUtils';
import { planApply, planUndo, stillAt, BatchChange, PriceField } from '@/utils/bulkPrice';

const BATCHES = 'price_batches';
const MAX_ITEMS = 5000;
// Un lote `pending` más nuevo que esto puede estar aplicándose (timeout de Vercel: 10s)
const IN_FLIGHT_MS = 30_000;
const PRICE_PROJECTION = { projection: { name: 1, code: 1, rentalPrice: 1, investmentPrice: 1 } };
const who = (ctx: AuthContext) => ctx.user?.name || ctx.user?.email || 'admin';
const oids = (ids: string[]) => ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));

async function lastBatchSummary(db: any) {
  const b = await db.collection(BATCHES).find({}, { projection: { changes: 0 } }).sort({ createdAt: -1 }).limit(1).next();
  if (!b) return null;
  return { _id: String(b._id), createdAt: b.createdAt, count: b.count, description: b.description, by: b.by, undoneAt: b.undoneAt || null };
}

export const GET = withAdminAuth(async () => {
  const db = (await clientPromise).db(DB_NAME);
  return NextResponse.json({ last: await lastBatchSummary(db) });
});

export const POST = withAdminAuth(async (context: AuthContext, req: Request) => {
  const body = await req.json().catch(() => ({}));
  const db = (await clientPromise).db(DB_NAME);
  const col = db.collection('equipment');
  const batches = db.collection(BATCHES);

  if (body?.action === 'apply') {
    const raw = (Array.isArray(body.changes) ? body.changes : []).filter((c: any) => c && ObjectId.isValid(String(c._id)));
    if (!raw.length) return NextResponse.json({ error: 'No hay precios para cambiar' }, { status: 400 });
    if (raw.length > MAX_ITEMS) return NextResponse.json({ error: 'Demasiados equipos en un solo aumento' }, { status: 400 });

    // Precio anterior: SIEMPRE de la base, y tiene que ser el de la vista previa
    const current = await col.find({ _id: { $in: oids(raw.map((c: any) => String(c._id))) } }, PRICE_PROJECTION).toArray();
    const { changes, stale } = planApply(raw, current);
    if (stale.length) {
      return NextResponse.json(
        { error: `Los precios de ${stale.length} ${stale.length === 1 ? 'equipo cambiaron' : 'equipos cambiaron'} mientras mirabas la vista previa. Abrí la vista previa de nuevo para ver los precios actuales.` },
        { status: 409 }
      );
    }
    if (!changes.length) return NextResponse.json({ error: 'Ningún precio cambia' }, { status: 400 });

    const description = String(body.description || 'Aumento masivo de precios').slice(0, 200);
    const by = who(context);
    // 1) Lote primero: si algo falla después, Deshacer igual puede volver atrás lo escrito
    const { insertedId } = await batches.insertOne({ createdAt: new Date(), by, description, count: changes.length, status: 'pending', changes });

    // 2) El filtro exige el precio anterior (por si cambió entre la lectura y la escritura)
    try {
      await col.bulkWrite(
        changes.map((c) => ({ updateOne: { filter: { _id: new ObjectId(c._id), ...c.old }, update: { $set: c.new } } })),
        { ordered: false }
      );
    } catch (e) {
      console.error('bulkPrice apply: bulkWrite', e);
      // Puede haber escrito una parte: se sigue para registrar el historial de eso
    }

    // 3) Historial solo de lo que quedó escrito
    const after = await col.find({ _id: { $in: oids(changes.map((c) => c._id)) } }, PRICE_PROJECTION).toArray();
    const byId = new Map((after as any[]).map((e) => [String(e._id), e]));
    const applied: BatchChange[] = changes.filter((c) => stillAt(byId.get(c._id), c.new));
    try {
      await createHistoryEntries(
        db,
        applied.map((c) => ({
          equipmentId: c._id,
          equipmentName: byId.get(c._id)?.name || '',
          equipmentCode: byId.get(c._id)?.code || '',
          action: 'edicion' as const,
          userId: context.user?.sub,
          changes: (Object.keys(c.new) as PriceField[]).map((f) => ({ field: f, oldValue: c.old[f], newValue: c.new[f] })),
          details: description
        })),
        { strict: true }
      );
    } catch {
      return NextResponse.json(
        { error: 'Se cambiaron precios pero no se pudo registrar el historial. Usá "Deshacer último aumento" y probá de nuevo.' },
        { status: 500 }
      );
    }

    // 4) Lote aplicado, con lo que de verdad cambió
    await batches.updateOne({ _id: insertedId }, { $set: { status: 'applied', count: applied.length, changes: applied } });
    if (applied.length < changes.length) {
      return NextResponse.json(
        { error: `Se actualizaron ${applied.length} de ${changes.length} equipos; los demás cambiaron en el medio. Abrí la vista previa de nuevo.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true, count: applied.length, batchId: String(insertedId) });
  }

  if (body?.action === 'undo') {
    const last = await batches.find({ undoneAt: { $exists: false } }, { projection: { _id: 1, status: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(1).next();
    if (!last) return NextResponse.json({ error: 'No hay ningún aumento para deshacer' }, { status: 404 });
    if (last.status === 'pending' && Date.now() - new Date(last.createdAt).getTime() < IN_FLIGHT_MS) {
      return NextResponse.json({ error: 'Hay un aumento aplicándose. Probá de nuevo en unos segundos.' }, { status: 409 });
    }
    // Tomar el lote de forma atómica: si otro "Deshacer" llegó antes, este no hace nada
    const by = who(context);
    const b = await batches.findOneAndUpdate(
      { _id: last._id, undoneAt: { $exists: false } },
      { $set: { undoneAt: new Date(), undoneBy: by } },
      { returnDocument: 'after' }
    );
    if (!b) return NextResponse.json({ error: 'Ese aumento ya se deshizo' }, { status: 409 });

    const ids: string[] = (b.changes || []).map((c: any) => String(c._id));
    const current = await col.find({ _id: { $in: oids(ids) } }, PRICE_PROJECTION).toArray();
    const { restore, skipped } = planUndo(b.changes || [], current);
    let restored: typeof restore = [];
    if (restore.length) {
      // El filtro vuelve a exigir que siga con el precio del aumento (por si cambió en el medio)
      try {
        await col.bulkWrite(
          restore.map((r) => ({ updateOne: { filter: { _id: new ObjectId(r._id), ...r.from }, update: { $set: r.set } } })),
          { ordered: false }
        );
      } catch (e) {
        console.error('bulkPrice undo: bulkWrite', e);
      }
      // Historial solo de lo que de verdad volvió al precio anterior
      const after = await col.find({ _id: { $in: oids(restore.map((r) => r._id)) } }, PRICE_PROJECTION).toArray();
      const byId = new Map((after as any[]).map((e) => [String(e._id), e]));
      restored = restore.filter((r) => stillAt(byId.get(r._id), r.set));
      await createHistoryEntries(
        db,
        restored.map((r) => ({
          equipmentId: r._id,
          equipmentName: byId.get(r._id)?.name || '',
          equipmentCode: byId.get(r._id)?.code || '',
          action: 'edicion' as const,
          userId: context.user?.sub,
          changes: (Object.keys(r.set) as PriceField[]).map((f) => ({ field: f, oldValue: r.from[f], newValue: r.set[f] })),
          details: `Deshecho: ${b.description || 'aumento masivo de precios'}`
        }))
      );
    }
    const notRestored = [...skipped, ...restore.filter((r) => !restored.includes(r)).map((r) => r._id)];
    await batches.updateOne({ _id: b._id }, { $set: { skipped: notRestored } });
    return NextResponse.json({ ok: true, restored: restored.length, skipped: notRestored.length });
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
});
