import { MongoClient } from 'mongodb';
import clientPromise from './mongodb';

export async function getEquipmentAction() {
  try {
    const typedClientPromise: Promise<MongoClient> =
      clientPromise as Promise<MongoClient>;
    const client = await typedClientPromise;
    const db = client.db('degano-app');
    const equipment = await db.collection('equipmentListV2').find();
    return equipment;
  } catch (error) {
    console.log(error);
  }
}
