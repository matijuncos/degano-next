import clientPromise from '@/lib/mongodb';
import { MongoClient, ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/withAuth';
import { getPermissions, obfuscatePhone } from '@/utils/roleUtils';

export const dynamic = 'force-dynamic';

// Editar campos de un cliente. Solo roles con canEditClients (admin/manager).
// El teléfono solo se actualiza si el rol puede verlo (canViewClientPhones),
// para no pisar el valor real con la versión ofuscada ('****').
export const PUT = withAuth(
  async (context: AuthContext, req: Request) => {
    try {
      const { _id, fullName, email, phoneNumber } = await req.json();
      if (!_id) {
        return NextResponse.json({ error: 'Missing _id' }, { status: 400 });
      }

      const permissions = getPermissions(context.role);
      const update: Record<string, any> = {};
      if (fullName !== undefined) update.fullName = fullName;
      if (email !== undefined) update.email = email;
      if (phoneNumber !== undefined && permissions.canViewClientPhones) {
        update.phoneNumber = phoneNumber;
      }

      const client = (await clientPromise) as MongoClient;
      const db = client.db('degano-app');
      await db
        .collection('clients')
        .updateOne({ _id: new ObjectId(String(_id)) }, { $set: update });

      const updated = await db
        .collection('clients')
        .findOne({ _id: new ObjectId(String(_id)) });

      const result = updated
        ? {
            ...updated,
            phoneNumber: obfuscatePhone(
              updated.phoneNumber,
              context.role,
              'client'
            )
          }
        : null;

      return NextResponse.json({ client: result }, { status: 200 });
    } catch (error) {
      console.error('Error updating client:', error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  },
  { requiredPermission: 'canEditClients' }
);
