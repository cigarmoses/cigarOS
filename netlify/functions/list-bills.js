import { getStore } from '@netlify/blobs';
import { verifyToken } from './verify-token.js';

export default async (req) => {
  const { searchParams } = new URL(req.url);
  const day = searchParams.get('day'); // YYYY-MM-DD
  if (!day) return new Response('Missing day', { status: 400 });

  const ok = await verifyToken(req);
  if (!ok) return new Response('Unauthorized', { status: 401 });

  const store = getStore('smokepos');
  const safeGet = async (key) => {
    try { return await store.get(key, { type: 'json' }) ?? []; }
    catch { return []; }
  };

  const pending      = await safeGet(`bills:pending:${day}`);
  const confirmed    = await safeGet(`bills:confirmed:${day}`);
  const transactions = await safeGet(`transactions:${day}`);

  const body = JSON.stringify({ pending, confirmed, transactions });
  return new Response(body, { headers: { 'Content-Type': 'application/json' } });
}
