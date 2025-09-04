// route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';

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
  const { fileName, fileType, bucket } = await req.json();

  if (!fileName || !fileType || !bucket) {
    return NextResponse.json({ error: 'Missing fileName, fileType or bucket' }, { status: 400 });
  }

  const uniqueFileName = `${nanoid()}-${fileName}`;
  const bucketName = bucketMap[bucket];

  const command = new PutObjectCommand({
    Bucket: bucketName!,
    Key: uniqueFileName,
    ContentType: fileType
  });

  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

  const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;

  return NextResponse.json({ signedUrl, url: publicUrl });
}
