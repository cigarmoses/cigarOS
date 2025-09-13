// netlify/functions/save-data.js
import { getStore } from '@netlify/blobs';
import { verifyToken } from './verify-token.js';

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // Protect writes (use the same ADMIN_TOKEN as admin/reports)
  const ok = await verifyToken(req);
  if (!ok) return new Response('Unauthorized', { status: 401 });

  const body = await req.json(); // { collection, status, day, bill }
  const { collection, bill } = body || {};
  if (!collection || !bill) {
    return new Response('Missing body', { status: 400 });
  }

  const store = getStore('smokepos');

  // Append to array stored at "collection" (e.g., bills:pending:YYYY-MM-DD)
  const existing = await store.get(collection, { type: 'json' }).catch(() => null);
  const list = Array.isArray(existing) ? existing : [];
  list.push(bill);
  await store.set(collection, JSON.stringify(list));

  // If confirmed, also append a transaction summary for the day
  if (bill.status === 'confirmed' && bill.day) {
    const txKey = `transactions:${bill.day}`;
    const txs = await store.get(txKey, { type: 'json' }).catch(() => null) || [];
    txs.push({
      id: bill.id,
      when: bill.atISO,
      customer: bill.loyalty || null,
      method: bill.paymentType || null, // cash/card
      itemCount: bill.items?.reduce((a,b)=> a + (b.qty||0), 0) || 0,
      subtotal: bill.subtotal || 0,
      tax: bill.tax || 0,
      total: bill.total || 0
    });
    await store.set(txKey, JSON.stringify(txs));
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
