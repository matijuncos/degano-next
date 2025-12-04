export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import {
  createHistoryEntry,
  getEquipmentHistory
} from '@/utils/equipmentHistoryUtils';
import { getSession } from '@auth0/nextjs-auth0';

/**
 * GET: Obtener historial de un equipamiento
 * Query params: equipmentId (requerido)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const equipmentId = searchParams.get('equipmentId');

    if (!equipmentId) {
      return NextResponse.json(
        { error: 'equipmentId is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('degano-app');

    const history = await getEquipmentHistory(db, equipmentId);

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching equipment history:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * POST: Crear entrada de historial manualmente
 * Body: CreateHistoryEntryParams
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    const body = await req.json();

    const client = await clientPromise;
    const db = client.db('degano-app');

    await createHistoryEntry(db, {
      ...body,
      userId: session?.user?.sub
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating history entry:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
