import clientPromise from '@/lib/mongodb';
import { MongoClient, ObjectId } from 'mongodb';
import type { NextApiResponse } from 'next';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export const GET = async function handler(
  req: NextRequest,
  res: NextApiResponse
) {
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const db = client.db('degano-app');
    const genres = await db
      .collection('genres')
      .find()
      .toArray()
      .then((genres) => genres.sort((a, b) => a.name.localeCompare(b.name)));

    // Invalidate cache for the specific path after fetching new data
    revalidatePath(req.nextUrl.pathname);

    return NextResponse.json({ genres }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};

export const POST = async function handler(
  req: NextRequest,
  res: NextApiResponse
) {
  try {
    const body = await req.json();
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const db = client.db('degano-app');

    // Transform array of strings to array of objects
    const genreDocuments = body.genres.map((genre: string) => ({
      name: genre
    }));
    const result = await db.collection('genres').insertMany(genreDocuments);

    revalidatePath(req.nextUrl.pathname);

    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};

export const DELETE = async function handler(
  req: NextRequest,
  res: NextApiResponse
) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID parameter is required' },
        { status: 400 }
      );
    }

    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const db = client.db('degano-app');
    const result = await db.collection('genres').deleteOne({
      _id: new ObjectId(id)
    });

    revalidatePath(req.nextUrl.pathname);

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};

export const PUT = async function handler(
  req: NextRequest,
  res: NextApiResponse
) {
  try {
    const body = await req.json();
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const db = client.db('degano-app');
    const result = await db
      .collection('genres')
      .updateOne({ _id: new ObjectId(body.id) }, { $set: body });

    revalidatePath(req.nextUrl.pathname);

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};
