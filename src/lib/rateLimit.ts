import { NextResponse } from 'next/server';

// Rate limit simple en memoria (best-effort). En serverless el store es por
// instancia, así que no es un límite distribuido perfecto — para eso haría falta
// Upstash Redis / Vercel KV. Alcanza como freno básico contra abuso/loops en una
// app interna ya protegida por auth.
type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

const clientIp = (req: Request): string => {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
};

// Devuelve un NextResponse 429 si se excede el límite, o null si está OK.
// key: identificador de la ruta/acción. limit: cantidad. windowMs: ventana.
export function rateLimit(
  req: Request,
  opts: { key: string; limit: number; windowMs: number }
): NextResponse | null {
  const bucketKey = `${opts.key}:${clientIp(req)}`;
  const now = Date.now();
  const b = store.get(bucketKey);

  if (!b || now > b.resetAt) {
    store.set(bucketKey, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }
  if (b.count >= opts.limit) {
    const retryAfter = Math.ceil((b.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Esperá un momento.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }
  b.count++;

  // Limpieza oportunista para que el Map no crezca indefinidamente
  if (store.size > 5000) {
    for (const [k, v] of store) if (now > v.resetAt) store.delete(k);
  }
  return null;
}
