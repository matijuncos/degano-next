import type { NextApiResponse } from 'next';
import { NextResponse } from 'next/server';

export const GET = async function handler(req: Request, res: NextApiResponse) {
  try {
    const clients = {};
    console.log('clients, ', clients);
    return NextResponse.json({ clients }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};
