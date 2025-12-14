import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getSession } from '@auth0/nextjs-auth0';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { folderName } = await req.json();

    if (!folderName) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }

    // Configurar OAuth2 con refresh token
    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GAPICONFIG_CLIENTID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.AUTH0_BASE_URL
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const baseFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Buscar carpeta del evento
    const folderSearch = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${baseFolderId}' in parents and trashed=false`,
      fields: 'files(id, name)'
    });

    if (
      !folderSearch.data.files ||
      folderSearch.data.files.length === 0
    ) {
      return NextResponse.json({ files: [] }, { status: 200 });
    }

    const eventFolderId = folderSearch.data.files[0].id;

    // Listar archivos en la carpeta del evento
    const filesResponse = await drive.files.list({
      q: `'${eventFolderId}' in parents and trashed=false`,
      fields: 'files(id, name, webViewLink, mimeType, createdTime)',
      orderBy: 'createdTime desc'
    });

    const files = filesResponse.data.files || [];

    return NextResponse.json({ files }, { status: 200 });
  } catch (error: any) {
    console.error('Error listing Google Drive files:', error);
    return NextResponse.json(
      { error: 'Failed to list files', details: error.message },
      { status: 500 }
    );
  }
}
