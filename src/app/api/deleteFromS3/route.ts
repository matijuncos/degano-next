import { NextRequest, NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

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
};

export async function POST(req: NextRequest) {
  const { url, bucket } = await req.json();
  if (!url || !bucket) {
    return NextResponse.json({ error: 'Missing URL or bucket' }, { status: 400 });
  }

  try {
    // Extrae la ruta completa después del dominio del bucket
    const bucketName = bucketMap[bucket];
    const bucketUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
    const key = decodeURIComponent(url.replace(bucketUrl, ''));

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key
    });

    await s3.send(command);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('S3 delete error:', error);
    return NextResponse.json({ error: 'Error deleting file' }, { status: 500 });
  }
}
