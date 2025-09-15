// netlify/functions/list-bills.js
import { getStore } from '@netlify/blobs';

function dayKey(dateStr) {
  return (dateStr ? new Date(dateStr) : new Date()).toISOString().slice(0,10);
}

export default async (req) => {
  try {
    const url = new URL(req.url);
    const day = dayKey(url.searchParams.get('day'));

    const bills = getStore('bills');
    const txs = getStore('transactions');

    const confirmed = JSON.parse((await bills.get(`confirmed:${day}.json`, { type: 'json' })) || '[]');
    const drafts = JSON.parse((await bills.get(`pending:${day}.json`, { type: 'json' })) || '[]');
    const rollup = JSON.parse((await txs.get(`rollup:${day}.json`, { type: 'json' })) || '[]');

    return new Response(JSON.stringify({ confirmed, drafts, rollup }), {
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'list-bills failed', detail: String(err) }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
};
