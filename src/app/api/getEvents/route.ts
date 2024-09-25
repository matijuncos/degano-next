import { MongoClient } from 'mongodb'; // Import ObjectId
import type { NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@auth0/nextjs-auth0';
export const GET = async function handler(
  req: NextRequest,
  res: NextApiResponse
) {
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const db = client.db('degano-app');
    const events = await db.collection('events').find().toArray();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    revalidatePath(req.nextUrl.pathname);
    const user = session.user;
    const isAdmin = user && user.role === 'admin';
    const ofuscatedEvents = events.map(({ ...event }) => {
      return {
        ...event,
        payment: isAdmin ? event.payment : null,
        equipment: event.equipment.map((eq: any) => {
          return {
            ...eq,
            price: isAdmin ? eq.price : '****'
          };
        })
      };
    });

    return NextResponse.json({ events: ofuscatedEvents }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};
