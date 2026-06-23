import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getSession } from '@auth0/nextjs-auth0';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId } = await req.json();

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GAPICONFIG_CLIENTID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.AUTH0_BASE_URL
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error making file public:', error);
    return NextResponse.json(
      { error: 'Failed to make file public', details: error.message },
      { status: 500 }
    );
  }
}
