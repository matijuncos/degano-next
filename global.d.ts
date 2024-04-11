import { MongoClient } from 'mongodb';
declare namespace NodeJS {
  interface Global {
    _mongoClientPromise?: Promise<MongoClient>;
  }
}
