import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getSession } from '@auth0/nextjs-auth0';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folderName = formData.get('folderName') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Configurar OAuth2 con refresh token
    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GAPICONFIG_CLIENTID,
      process.env.GOOGLE_CLIENT_SECRET, // Necesitaremos agregar esto
      process.env.AUTH0_BASE_URL
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Buscar o crear carpeta del evento
    let eventFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (folderName) {
      // Buscar si existe la carpeta del evento
      const folderSearch = await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${eventFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)'
      });

      if (folderSearch.data.files && folderSearch.data.files.length > 0) {
        eventFolderId = folderSearch.data.files[0].id!;
      } else {
        // Crear carpeta del evento
        const folderMetadata = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [eventFolderId!]
        };

        const folder = await drive.files.create({
          requestBody: folderMetadata,
          fields: 'id'
        });

        eventFolderId = folder.data.id!;
      }
    }

    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Subir archivo
    const fileMetadata = {
      name: file.name,
      parents: [eventFolderId!]
    };

    const media = {
      mimeType: file.type,
      body: require('stream').Readable.from(buffer)
    };

    const uploadedFile = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink'
    });

    return NextResponse.json(
      {
        success: true,
        file: {
          id: uploadedFile.data.id,
          name: uploadedFile.data.name,
          webViewLink: uploadedFile.data.webViewLink
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error uploading to Google Drive:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', details: error.message },
      { status: 500 }
    );
  }
}
