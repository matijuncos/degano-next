import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

// Buckets propios permitidos (evita firmar URLs de terceros).
const ALLOWED_BUCKETS = new Set(
  [
    process.env.AWS_S3_EQUIPMENT_BUCKET_NAME,
    process.env.AWS_S3_BANDS_BUCKET_NAME,
    process.env.AWS_S3_BUDGETS_BUCKET_NAME,
    process.env.AWS_S3_EVENTS_BUCKET_NAME || 'degano-events-files'
  ].filter(Boolean) as string[]
);

// Devuelve una URL prefirmada (presigned GET) para ver/descargar un archivo de
// nuestros buckets S3. Requiere sesión. Permite tener los buckets privados:
// el archivo solo es accesible a través de esta URL temporal (60s).
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: 'signS3Url', limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const unauth = await requireAuth();
  if (unauth) return unauth;

  try {
    const { url, download, fileName } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    // Parsear bucket + key desde la URL (https://<bucket>.s3.<region>.amazonaws.com/<key>)
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
    }
    const bucketName = parsed.hostname.split('.s3.')[0];
    const key = decodeURIComponent(parsed.pathname.replace(/^\//, ''));

    if (!bucketName || !ALLOWED_BUCKETS.has(bucketName) || !key) {
      return NextResponse.json({ error: 'URL no permitida' }, { status: 400 });
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      ...(download
        ? {
            ResponseContentDisposition: `attachment; filename="${
              fileName || key.split('/').pop()
            }"`
          }
        : {})
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error('signS3Url error:', error);
    return NextResponse.json({ error: 'Error firmando URL' }, { status: 500 });
  }
}
