import { getStore } from '@netlify/blobs';
import { verifyToken } from './verify-token.js';

function dayKey(dateStr) {
  // YYYY-MM-DD; fall back to "today"
  return (dateStr || new Date().toISOString().slice(0, 10));
}

// Utility: JSON response with CORS
function json(data, init = {}) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, authorization, x-admin-token',
    'access-control-allow-methods': 'OPTIONS, POST',
    ...init.headers,
  };
  return new Response(JSON.stringify(data), { ...init, headers });
}

export default async (req) => {
  // Handle preflight quickly
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    // ---- Admin auth
    const ok = await verifyToken(req);
    if (!ok) return json({ error: 'unauthorized' }, { status: 401 });

    // ---- Parse input
    const url = new URL(req.url);
    const qDay = url.searchParams.get('day'); // optional ?day=YYYY-MM-DD
    const body = await req.json().catch(() => ({}));

    // supported payloads:
    // { type: 'draft'|'confirmed'|'transaction', day?: 'YYYY-MM-DD', bill?: {...}, tx?: {...} }
    const type = String(body.type || '').toLowerCase();
    const day = dayKey(body.day || qDay);

    // storage
    const bills = getStore('bills');          // namespaces used by reports
    const txs   = getStore('transactions');

    // read/append/write helper
    async function appendJSON(store, key, item) {
      const raw = (await store.get(key)) || '[]';
      const arr = Array.isArray(raw) ? raw : JSON.parse(raw);
      arr.push(item);
      await store.set(key, JSON.stringify(arr), {
        contentType: 'application/json',
      });
      return arr.length;
    }

    // Switch on save type
    if (type === 'draft') {
      // Expect body.bill
      if (!body.bill) return json({ error: 'missing bill' }, { status: 400 });
      const key = `pending:${day}.json`;
      const count = await appendJSON(bills, key, body.bill);
      return json({ ok: true, kind: 'draft', day, count });

    } else if (type === 'confirmed') {
      // Expect body.bill
      if (!body.bill) return json({ error: 'missing bill' }, { status: 400 });
      const key = `confirmed:${day}.json`;
      const count = await appendJSON(bills, key, body.bill);
      return json({ ok: true, kind: 'confirmed', day, count });

    } else if (type === 'transaction') {
      // Expect body.tx (rollup entry)
      if (!body.tx) return json({ error: 'missing tx' }, { status: 400 });
      const key = `rollup:${day}.json`;
      const count = await appendJSON(txs, key, body.tx);
      return json({ ok: true, kind: 'transaction', day, count });
    }

    return json({ error: 'invalid type' }, { status: 400 });

  } catch (e) {
    return json({ error: 'save-data failed', detail: String(e) }, { status: 500 });
  }
};
