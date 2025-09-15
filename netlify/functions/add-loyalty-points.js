// netlify/functions/add-loyalty-points.js
// Adds loyalty points equal to Math.round(subtotal), where subtotal is pre-tax.
// Request body: { id: string, delta: number }

import { getStore } from '@netlify/blobs';

export default async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const { id, delta } = await req.json();
    if (!id || typeof delta !== 'number') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing id or delta' }),
        {
          status: 400,
          headers: { 'content-type': 'application/json; charset=utf-8' },
        }
      );
    }

    const add = Math.round(delta); // nearest whole number
    const store = getStore('contacts');
    const txt = await store.get('contacts.json');
    const arr = txt ? JSON.parse(txt) : [];

    // find contact by id (string or number), fallback to index
    let idx = arr.findIndex(
      (r) => r.id === id || String(r.id) === String(id)
    );
    if (idx < 0) {
      const asIndex = Number(id);
      if (!Number.isNaN(asIndex) && arr[asIndex]) idx = asIndex;
    }
    if (idx < 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Contact not found' }),
        {
          status: 404,
          headers: { 'content-type': 'application/json; charset=utf-8' },
        }
      );
    }

    const current = Number(arr[idx].points ?? arr[idx].total_points ?? 0);
    const next = Math.max(0, current + add);

    arr[idx].points = next;
    arr[idx].total_points = next; // keep both fields in sync

    // optional: keep history
    // arr[idx].history = arr[idx].history || [];
    // arr[idx].history.push({ ts: Date.now(), awarded: add });

    await store.set('contacts.json', JSON.stringify(arr));

    return new Response(
      JSON.stringify({ ok: true, id, added: add, total: next }),
      {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      {
        status: 500,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }
    );
  }
};
