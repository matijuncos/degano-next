// src/app/api/staffPolicy/route.ts
// Póliza de seguro de cada empleado de STAFF (PDF en S3).
// - Subir / quitar: SOLO admin.
// - Ver: el admin o el propio empleado. Para cualquier otro → 404.
// El archivo se sube directo del browser con presigned PUT (/api/uploadToS3,
// bucket 'budgets', carpeta 'staff-policies'); acá solo se registra.
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { withAuth, withAdminAuth, AuthContext } from '@/lib/withAuth';
import { resolveEmployee } from '@/lib/resolveEmployee';
import { getDb } from '@/lib/staffLedgerServer';
import { contentDisposition } from '@/utils/staffPolicyFile';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});
const BUCKET = process.env.AWS_S3_BUDGETS_BUCKET_NAME!;
const FOLDER = 'staff-policies/';

const notFound = () => NextResponse.json({ error: 'Póliza no encontrada' }, { status: 404 });
const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });

const employeeFilter = (id: string | null) =>
  id && ObjectId.isValid(id) ? { _id: new ObjectId(id) } : null;

// https://<bucket>.s3.<region>.amazonaws.com/<key> → key, solo si es nuestra carpeta
function keyFromUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.split('.s3.')[0] !== BUCKET) return null;
    const key = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    return key.startsWith(FOLDER) && key.toLowerCase().endsWith('.pdf') ? key : null;
  } catch {
    return null;
  }
}

async function deleteObject(key: string) {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (error) {
    // No bloquea: el registro ya no apunta al archivo
    console.error('[staffPolicy] no se pudo borrar de S3:', key, error);
  }
}

export const GET = withAuth(async (ctx: AuthContext, req: Request) => {
  try {
    const employeeId = new URL(req.url).searchParams.get('employeeId');
    const filter = employeeFilter(employeeId);
    if (!filter) return notFound();
    const db = await getDb();

    if (ctx.role !== 'admin') {
      const me = await resolveEmployee(db, ctx.user);
      if (!me.ok || String(me.employee._id) !== employeeId) return notFound();
    }

    const emp = await db.collection('employees').findOne(filter, { projection: { insurancePolicy: 1 } });
    const policy = emp?.insurancePolicy;
    if (!policy?.key) return notFound();

    const signedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: policy.key,
        ResponseContentType: 'application/pdf',
        ResponseContentDisposition: contentDisposition(String(policy.fileName))
      }),
      { expiresIn: 60 }
    );
    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error('[staffPolicy GET]', error);
    return NextResponse.json({ error: 'Error al obtener la póliza' }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (_ctx: AuthContext, req: Request) => {
  try {
    const { employeeId, url, fileName } = await req.json();
    const filter = employeeFilter(employeeId);
    if (!filter) return badRequest('Falta el empleado');
    const key = keyFromUrl(url);
    if (!key) return badRequest('Archivo inválido: tiene que ser un PDF subido para pólizas');
    const name = typeof fileName === 'string' && fileName.trim() ? fileName.trim() : 'poliza.pdf';

    const db = await getDb();
    const emp = await db.collection('employees').findOne(filter, { projection: { insurancePolicy: 1 } });
    if (!emp) return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });

    const insurancePolicy = { key, fileName: name, uploadedAt: new Date() };
    await db.collection('employees').updateOne(filter, { $set: { insurancePolicy } });
    if (emp.insurancePolicy?.key && emp.insurancePolicy.key !== key) await deleteObject(emp.insurancePolicy.key);

    return NextResponse.json({ insurancePolicy: { fileName: name, uploadedAt: insurancePolicy.uploadedAt } });
  } catch (error) {
    console.error('[staffPolicy POST]', error);
    return NextResponse.json({ error: 'Error al guardar la póliza' }, { status: 500 });
  }
});

export const DELETE = withAdminAuth(async (_ctx: AuthContext, req: Request) => {
  try {
    const filter = employeeFilter(new URL(req.url).searchParams.get('employeeId'));
    if (!filter) return badRequest('Falta el empleado');
    const db = await getDb();
    const emp = await db.collection('employees').findOne(filter, { projection: { insurancePolicy: 1 } });
    if (!emp?.insurancePolicy) return notFound();
    await db.collection('employees').updateOne(filter, { $unset: { insurancePolicy: '' } });
    if (emp.insurancePolicy.key) await deleteObject(emp.insurancePolicy.key);
    return NextResponse.json({ insurancePolicy: null });
  } catch (error) {
    console.error('[staffPolicy DELETE]', error);
    return NextResponse.json({ error: 'Error al quitar la póliza' }, { status: 500 });
  }
});
