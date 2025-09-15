// netlify/functions/save-data.js
// Save POS bills (draft/confirmed), record transactions, and update loyalty points/history.

import { getStore } from '@netlify/blobs';

function dayKey(dateStr) {
  return (dateStr ? new Date(dateStr) : new Date()).toISOString().slice(0,10); // YYYY-MM-DD
}

function clampInt(n) {
  const v = Number.parseInt(n, 10);
  return Number.isFinite(v) ? v : 0;
}

export default async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const { action, bill } = await req.json();
    if (!action || !bill) throw new Error('Missing action or bill');

    const storeBills = getStore('bills');
    const storeTx = getStore('transactions');
    const storeL = getStore('loyalty');

    const now = new Date();
    const day = dayKey(now.toISOString());

    // Validate bill numbers
    const subtotal = Math.max(0, Number(bill.subtotal || 0));
    const tax = Math.max(0, Number(bill.tax || 0));
    const total = Math.max(0, Number(bill.total || 0));

    // authoritative points: 1 point per pre-tax dollar, rounded; then apply manual delta
    const basePoints = Math.round(subtotal);
    const manualDelta = clampInt(bill.manualDelta || 0);
    const finalPoints = basePoints + manualDelta;

    // Compact bill to store
    const saved = {
      ts: now.toISOString(),
      itemsCount: clampInt(bill.itemsCount || 0),
      items: Array.isArray(bill.items) ? bill.items : [],
      subtotal: +subtotal.toFixed(2),
      tax: +tax.toFixed(2),
      total: +total.toFixed(2),
      method: bill.method || 'cash',
      loyalty: {
        id: bill.loyalty?.id || '',
        name: bill.loyalty?.name || ''
      },
      points: finalPoints
    };

    // Save bill
    const key = `${action === 'confirmed' ? 'confirmed' : 'pending'}:${day}.json`;
    const arr = JSON.parse((await storeBills.get(key, { type: 'json' })) || '[]');
    arr.push(saved);
    await storeBills.set(key, JSON.stringify(arr), { metadata: { updated: now.toISOString() } });

    // If confirmed, record transaction rollup & update loyalty
    if (action === 'confirmed') {
      // 1) rollup list for reports
      const txKey = `rollup:${day}.json`;
      const txArr = JSON.parse((await storeTx.get(txKey, { type: 'json' })) || '[]');
      txArr.push({
        ts: saved.ts,
        customer: saved.loyalty?.name || '',
        method: saved.method,
        items: saved.itemsCount,
        subtotal: saved.subtotal,
        tax: saved.tax,
        total: saved.total,
        points: saved.points
      });
      await storeTx.set(txKey, JSON.stringify(txArr), { metadata: { updated: now.toISOString() } });

      // 2) loyalty points & history
      const cid = saved.loyalty?.id || '';
      if (cid) {
        const ptsKey = `points:${cid}`;
        const cur = clampInt(await storeL.get(ptsKey, { type: 'text' }));
        const next = cur + saved.points;
        await storeL.set(ptsKey, String(next));

        const histKey = `history:${cid}:${day}.json`;
        const hArr = JSON.parse((await storeL.get(histKey, { type: 'json' })) || '[]');
        hArr.push({
          ts: saved.ts,
          items: saved.itemsCount,
          subtotal: saved.subtotal,
          tax: saved.tax,
          total: saved.total,
          points: saved.points
        });
        await storeL.set(histKey, JSON.stringify(hArr));
      }
    }

    return new Response(JSON.stringify({ ok: true, saved }), {
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'save-data failed', detail: String(err) }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
};
