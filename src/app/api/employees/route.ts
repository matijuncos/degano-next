// src/app/api/employees/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { withAuth, withAdminAuth, AuthContext } from '@/lib/withAuth';

export const dynamic = 'force-dynamic';

async function listAllEmployees() {
  const client = await clientPromise;
  const db = client.db('degano-app');
  return db.collection('employees').find().toArray();
}

export const GET = withAuth(async (context: AuthContext) => {
  try {
    const employees = await listAllEmployees();
    return NextResponse.json(employees);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener empleados' },
      { status: 500 }
    );
  }
});

export const POST = withAdminAuth(async (context: AuthContext, req: Request) => {
  try {
    const client = await clientPromise;
    const db = client.db('degano-app');
    const body = await req.json();

    await db.collection('employees').insertOne(body);
    const employees = await listAllEmployees();
    return NextResponse.json(employees, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear empleado' },
      { status: 500 }
    );
  }
});

export const PUT = withAdminAuth(async (context: AuthContext, req: Request) => {
  try {
    const client = await clientPromise;
    const db = client.db('degano-app');
    const body = await req.json();
    const { _id, ...rest } = body;
    const updateQuery: any = { $set: rest };

    if (!rest.licenseType) {
      updateQuery.$unset = { licenseType: '' };
    }

    const result = await db
      .collection('employees')
      .updateOne({ _id: new ObjectId(String(_id)) }, updateQuery);

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    const employees = await listAllEmployees();
    return NextResponse.json(employees);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al actualizar empleado' },
      { status: 500 }
    );
  }
});

export const DELETE = withAdminAuth(async (context: AuthContext, req: Request) => {
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

    const employees = await listAllEmployees();
    return NextResponse.json(employees);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al eliminar empleado' },
      { status: 500 }
    );
  }
});
