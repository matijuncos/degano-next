import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getSession } from '@auth0/nextjs-auth0';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, mimeType, folderName } = await req.json();

    if (!fileName || !folderName) {
      return NextResponse.json({ error: 'fileName and folderName are required' }, { status: 400 });
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

    // Buscar o crear carpeta del evento
    let eventFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (folderName) {
      const folderSearch = await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${eventFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)'
      });

      if (folderSearch.data.files && folderSearch.data.files.length > 0) {
        eventFolderId = folderSearch.data.files[0].id!;
      } else {
        const folder = await drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [eventFolderId!]
          },
          fields: 'id'
        });

        eventFolderId = folder.data.id!;

        await drive.permissions.create({
          fileId: eventFolderId,
          requestBody: { role: 'reader', type: 'anyone' }
        });
      }
    }

    // Obtener access token fresco para el upload directo
    const { token } = await oauth2Client.getAccessToken();

    // Iniciar sesión de upload resumable directamente con la API de Google Drive
    const initResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: fileName,
          parents: [eventFolderId]
        })
      }
    );

    if (!initResponse.ok) {
      const error = await initResponse.text();
      throw new Error(`Failed to initiate upload: ${error}`);
    }

    // La URL de upload resumable viene en el header Location
    const uploadUrl = initResponse.headers.get('Location');

    if (!uploadUrl) {
      throw new Error('No upload URL returned from Google Drive');
    }

    return NextResponse.json({
      uploadUrl,
      folderId: eventFolderId,
      accessToken: token
    });
  } catch (error: any) {
    console.error('Error getting upload URL:', error);
    return NextResponse.json(
      { error: 'Failed to get upload URL', details: error.message },
      { status: 500 }
    );
  }
}
