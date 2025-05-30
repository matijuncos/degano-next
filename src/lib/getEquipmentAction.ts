import { MongoClient } from 'mongodb';
import clientPromise from './mongodb';
import { Session } from '@auth0/nextjs-auth0';

export async function getEquipmentAction(session: Session) {
  if (!session) return;

  const isAdmin = session.user.role === 'admin';
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const db = client.db('degano-app');
    const equipmentList = await db.collection('equipmentListV2').find().toArray();

    const response = {
      equipment: isAdmin
        ? equipmentList
        : equipmentList.map((eq: any) => {
            return {
              ...eq,
              price: '****'
            };
          })
    };

    return response;
  } catch (error) {
    console.log(error);
  }
}
