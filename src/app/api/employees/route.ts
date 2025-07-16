// src/app/api/employees/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('degano-app');
    const employees = await db.collection('employees').find().toArray();
    return NextResponse.json(employees);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener empleados' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const client = await clientPromise;
  const db = client.db('degano-app');
  const body = await req.json();

  const result = await db.collection('employees').insertOne(body);
  return NextResponse.json({ ...body, _id: result.insertedId });
}

export async function PUT(req: Request) {
  const client = await clientPromise;
  const db = client.db('degano-app');
  const body = await req.json();
  const { _id, ...rest } = body;
  const updateQuery: any = { $set: rest };

  if (!rest.licenseType) {
    updateQuery.$unset = { licenseType: '' };
  }

  await db
    .collection('employees')
    .updateOne({ _id: new ObjectId(_id) }, updateQuery);

  return NextResponse.json(body);
}

export async function DELETE(req: Request) {
  const client = await clientPromise;
  const db = client.db('degano-app');
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Falta el ID del empleado' },
      { status: 400 }
    );
  }

  try {
    const result = await db
      .collection('employees')
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al eliminar empleado' },
      { status: 500 }
    );
  }
}
