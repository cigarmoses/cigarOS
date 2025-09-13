import { getStore } from '@netlify/blobs';

function dayKey(dateStr) {
  // expects YYYY-MM-DD
  return (dateStr || new Date().toISOString().slice(0, 10));
}

export default async (req) => {
  try {
    const url = new URL(req.url);
    const day = dayKey(url.searchParams.get('day'));

    const bills = getStore('bills');       // namespaces used by reports
    const txs = getStore('transactions');

    const confirmed = JSON.parse((await bills.get(`confirmed:${day}.json`)) || '[]');
    const drafts   = JSON.parse((await bills.get(`pending:${day}.json`))   || '[]');
    const rollup   = JSON.parse((await txs.get(`rollup:${day}.json`))      || '[]');

    return new Response(JSON.stringify({ confirmed, drafts, rollup }), {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'list-bills failed', detail: String(e) }),
      { status: 500 }
    );
  }
};
