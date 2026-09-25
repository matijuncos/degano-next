// API de tareas de los tableros (Comunicación Interna). Cualquier usuario que
// PUEDA VER el tablero puede crear/editar/borrar/mover sus tareas. Se verifica
// el acceso al tablero en cada operación para que un tablero restringido no
// filtre sus tareas a quien no es miembro.
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/requireAuth';
import { resolveEmployee } from '@/lib/resolveEmployee';
import { TASK_STATUSES, TaskStatus } from '@/types/boards';

async function getDb() {
  const client = await clientPromise;
  return client.db('degano-app');
}

// El acceso al tablero se resuelve con el id del registro de STAFF (directorio
// único, vinculado por email), igual que en /api/boards y en calendarios.
async function currentUser(): Promise<{
  employeeId: string | null;
  name: string | null;
}> {
  try {
    const session = await getSession();
    const u: any = session?.user;
    if (!u) return { employeeId: null, name: null };

    const db = await getDb();
    const resolved = await resolveEmployee(db, u);

    return {
      employeeId: resolved.ok ? String(resolved.employee._id) : null,
      name: u.name || u.nickname || u.email || null
    };
  } catch {
    return { employeeId: null, name: null };
  }
}

function isValidStatus(s: unknown): s is TaskStatus {
  return typeof s === 'string' && TASK_STATUSES.includes(s as TaskStatus);
}

// ¿El usuario (por su id de empleado) puede ver el tablero boardId?
async function canAccessBoard(
  db: any,
  boardId: string,
  employeeId: string | null
): Promise<boolean> {
  if (!boardId) return false;
  let board: any;
  try {
    board = await db.collection('boards').findOne({ _id: new ObjectId(boardId) });
  } catch {
    return false;
  }
  if (!board) return false;
  if (!board.visibility || board.visibility === 'all') return true;
  if (!employeeId) return false;
  const members = (board.memberIds || []).map(String);
  return String(board.ownerId) === employeeId || members.includes(employeeId);
}

// Una Response nueva por request: el body de una Response se puede leer una sola vez
const forbidden = () => NextResponse.json({ error: 'Sin acceso a este tablero' }, { status: 403 });

// GET ?boardId=... → tareas del tablero (si el usuario tiene acceso)
export async function GET(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get('boardId');
    if (!boardId) {
      return NextResponse.json({ error: 'Falta boardId' }, { status: 400 });
    }
    const db = await getDb();
    const { employeeId } = await currentUser();
    if (!(await canAccessBoard(db, boardId, employeeId))) return forbidden();

    const tasks = await db
      .collection('tasks')
      .find({ boardId })
      .sort({ order: 1, createdAt: 1 })
      .toArray();
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('[tasks GET]', error);
    return NextResponse.json({ error: 'Error al obtener tareas' }, { status: 500 });
  }
}

// POST → crear tarea
export async function POST(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const body = await req.json();
    if (!body.boardId) {
      return NextResponse.json({ error: 'Falta boardId' }, { status: 400 });
    }
    if (!body.title || !String(body.title).trim()) {
      return NextResponse.json({ error: 'El título es obligatorio' }, { status: 400 });
    }
    const db = await getDb();
    const { employeeId, name } = await currentUser();
    if (!(await canAccessBoard(db, String(body.boardId), employeeId))) return forbidden();

    const status: TaskStatus = isValidStatus(body.status) ? body.status : 'pending';
    const countInColumn = await db
      .collection('tasks')
      .countDocuments({ boardId: body.boardId, status });
    const now = new Date();
    const doc = {
      boardId: String(body.boardId),
      title: String(body.title).trim(),
      description: body.description ? String(body.description) : '',
      status,
      assigneeId: body.assigneeId ? String(body.assigneeId) : null,
      assigneeName: body.assigneeName ? String(body.assigneeName) : null,
      order: countInColumn,
      createdAt: now,
      updatedAt: now,
      createdBy: name
    };
    const result = await db.collection('tasks').insertOne(doc);
    return NextResponse.json({ task: { ...doc, _id: result.insertedId } }, { status: 201 });
  } catch (error) {
    console.error('[tasks POST]', error);
    return NextResponse.json({ error: 'Error al crear tarea' }, { status: 500 });
  }
}

// PUT → editar una tarea (body.id) O reordenar en lote (body.reorder)
export async function PUT(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const body = await req.json();
    const db = await getDb();
    const { employeeId } = await currentUser();

    // Reordenamiento en lote tras drag & drop: [{ id, status, order }]
    if (Array.isArray(body.reorder)) {
      const ids = body.reorder
        .filter((r: any) => r?.id)
        .map((r: any) => {
          try {
            return new ObjectId(String(r.id));
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      // Verificar acceso a los tableros involucrados
      const affected = await db
        .collection('tasks')
        .find({ _id: { $in: ids } }, { projection: { boardId: 1 } })
        .toArray();
      const boardIds = Array.from(new Set(affected.map((t: any) => String(t.boardId))));
      for (const bId of boardIds) {
        if (!(await canAccessBoard(db, bId, employeeId))) return forbidden();
      }

      const ops = body.reorder
        .filter((r: any) => r?.id && isValidStatus(r.status) && typeof r.order === 'number')
        .map((r: any) => ({
          updateOne: {
            filter: { _id: new ObjectId(String(r.id)) },
            update: { $set: { status: r.status, order: r.order, updatedAt: new Date() } }
          }
        }));
      if (ops.length > 0) {
        await db.collection('tasks').bulkWrite(ops);
      }
      return NextResponse.json({ success: true });
    }

    // Edición de una tarea puntual
    if (!body.id) {
      return NextResponse.json({ error: 'Falta el id de la tarea' }, { status: 400 });
    }
    const taskId = new ObjectId(String(body.id));
    const task = await db.collection('tasks').findOne({ _id: taskId }, { projection: { boardId: 1 } });
    if (!task) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    if (!(await canAccessBoard(db, String(task.boardId), employeeId))) return forbidden();

    const { id, _id, ...rest } = body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof rest.title === 'string') updates.title = rest.title.trim();
    if (typeof rest.description === 'string') updates.description = rest.description;
    if (isValidStatus(rest.status)) updates.status = rest.status;
    if (typeof rest.order === 'number') updates.order = rest.order;
    if ('assigneeId' in rest) updates.assigneeId = rest.assigneeId ? String(rest.assigneeId) : null;
    if ('assigneeName' in rest) updates.assigneeName = rest.assigneeName ? String(rest.assigneeName) : null;

    await db.collection('tasks').updateOne({ _id: taskId }, { $set: updates });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[tasks PUT]', error);
    return NextResponse.json({ error: 'Error al editar tarea' }, { status: 500 });
  }
}

// DELETE ?id=... → borrar tarea
export async function DELETE(req: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Falta el id de la tarea' }, { status: 400 });
    }
    const db = await getDb();
    const { employeeId } = await currentUser();
    const taskId = new ObjectId(id);
    const task = await db.collection('tasks').findOne({ _id: taskId }, { projection: { boardId: 1 } });
    if (!task) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    if (!(await canAccessBoard(db, String(task.boardId), employeeId))) return forbidden();

    await db.collection('tasks').deleteOne({ _id: taskId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[tasks DELETE]', error);
    return NextResponse.json({ error: 'Error al borrar tarea' }, { status: 500 });
  }
}
