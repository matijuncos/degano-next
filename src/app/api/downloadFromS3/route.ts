import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireAuth } from '@/lib/requireAuth';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const bucketMap: Record<string, string> = {
  equipment: process.env.AWS_S3_EQUIPMENT_BUCKET_NAME!,
  bands: process.env.AWS_S3_BANDS_BUCKET_NAME!,
  budgets: process.env.AWS_S3_BUDGETS_BUCKET_NAME!,
  events: process.env.AWS_S3_EVENTS_BUCKET_NAME || 'degano-events-files',
};

export async function POST(req: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { url, fileName, bucket } = await req.json();

  if (!url || !fileName || !bucket) {
    return NextResponse.json({ error: 'Missing url, fileName or bucket' }, { status: 400 });
  }

  const bucketName = bucketMap[bucket];
  const bucketUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
  const key = decodeURIComponent(url.replace(bucketUrl, ''));

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${fileName}"`
  });

  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

  return NextResponse.json({ signedUrl });
}
