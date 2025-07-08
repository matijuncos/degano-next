// equipment/route.ts
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  const client = await clientPromise;
  const db = client.db('degano-app');
  const equipments = await db
    .collection('equipment')
    .find()
    .sort({ name: 1 })
    .toArray();
  return NextResponse.json(equipments);
}

export async function POST(req: Request) {
  const form = await req.formData();

  const client = await clientPromise;
  const db = client.db('degano-app');

  const getValue = (key: string) => {
    try {
      return JSON.parse(form.get(key)?.toString() || 'null');
    } catch {
      return form.get(key)?.toString() || '';
    }
  };

  const outOfService = {
    isOut: getValue('isOut') === 'true',
    reason: getValue('reason') || ''
  };

  const imageFile = form.get('imageFile') as File | null;
  const pdfFile = form.get('pdfFile') as File | null;

  const fileToBase64 = async (file: File) => {
    const buffer = Buffer.from(await file.arrayBuffer());
    return `data:${file.type};base64,${buffer.toString('base64')}`;
  };

  const newItem: any = {
    name: getValue('name'),
    code: getValue('code'),
    categoryId: getValue('categoryId'),
    brand: getValue('brand'),
    model: getValue('model'),
    serialNumber: getValue('serialNumber'),
    rentalPrice: Number(getValue('rentalPrice')),
    investmentPrice: Number(getValue('investmentPrice')),
    weight: Number(getValue('weight')),
    location: getValue('location'),
    outOfService,
    history: getValue('history')
  };

  if (imageFile && imageFile.size > 0) {
    newItem.imageBase64 = await fileToBase64(imageFile);
  }

  if (pdfFile && pdfFile.size > 0) {
    newItem.pdfBase64 = await fileToBase64(pdfFile);
  }

  const insertResult = await db.collection('equipment').insertOne(newItem);

  const deltaAvailable = newItem.outOfService?.isOut ? 0 : 1;
  await db.collection('categories').updateOne(
    { _id: new ObjectId(String(newItem.categoryId)) },
    {
      $inc: {
        totalStock: 1,
        availableStock: deltaAvailable
      }
    }
  );

  return NextResponse.json({ ...newItem, _id: insertResult.insertedId });
}

export async function PUT(req: Request) {
  const form = await req.formData();

  const client = await clientPromise;
  const db = client.db('degano-app');

  const _id = form.get('_id')?.toString()!;
  const objectId = new ObjectId(_id);

  const getValue = (key: string) => {
    try {
      return JSON.parse(form.get(key)?.toString() || 'null');
    } catch {
      return form.get(key)?.toString() || '';
    }
  };

  const outOfService = {
    isOut: getValue('isOut') === 'true',
    reason: getValue('reason') || ''
  };

  const imageFile = form.get('imageFile') as File | null;
  const pdfFile = form.get('pdfFile') as File | null;

  const fileToBase64 = async (file: File) => {
    const buffer = Buffer.from(await file.arrayBuffer());
    return `data:${file.type};base64,${buffer.toString('base64')}`;
  };

  const updateData: any = {
    name: getValue('name'),
    code: getValue('code'),
    categoryId: getValue('categoryId'),
    brand: getValue('brand'),
    model: getValue('model'),
    serialNumber: getValue('serialNumber'),
    rentalPrice: Number(getValue('rentalPrice')),
    investmentPrice: Number(getValue('investmentPrice')),
    weight: Number(getValue('weight')),
    location: getValue('location'),
    outOfService,
    history: getValue('history')
  };

  if (imageFile && imageFile.size > 0) {
    updateData.imageBase64 = await fileToBase64(imageFile);
  }

  if (pdfFile && pdfFile.size > 0) {
    updateData.pdfBase64 = await fileToBase64(pdfFile);
  }

  const oldItem = await db.collection('equipment').findOne({ _id: objectId });
  const wasOut = oldItem?.outOfService?.isOut;
  const isOut = updateData.outOfService?.isOut;

  await db
    .collection('equipment')
    .updateOne({ _id: objectId }, { $set: updateData });

  let deltaAvailable = 0;
  if (wasOut !== isOut) {
    deltaAvailable = wasOut && !isOut ? 1 : !wasOut && isOut ? -1 : 0;
  }

  if (deltaAvailable !== 0) {
    await db.collection('categories').updateOne(
      { _id: new ObjectId(String(updateData.categoryId)) },
      {
        $inc: { availableStock: deltaAvailable }
      }
    );
  }

  const updatedItem = await db
    .collection('equipment')
    .findOne({ _id: objectId });
  return NextResponse.json(updatedItem);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db('degano-app');

  const equipment = await db
    .collection('equipment')
    .findOne({ _id: new ObjectId(id) });
  if (equipment) {
    const deltaAvailable = equipment.outOfService?.isOut ? 0 : -1;
    await db.collection('categories').updateOne(
      { _id: new ObjectId(String(equipment.categoryId)) },
      {
        $inc: {
          totalStock: -1,
          availableStock: deltaAvailable
        }
      }
    );
  }

  await db.collection('equipment').deleteOne({ _id: new ObjectId(id) });

  return NextResponse.json({ success: true });
}
