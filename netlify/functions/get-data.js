import { getStore } from '@netlify/blobs';

export default async () => {
  try {
    const store = getStore('data');              // blobs “data” namespace
    const txt = (await store.get('inventory.json')) || '[]';
    return new Response(txt, {
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'get-data failed', detail: String(e) }), { status: 500 });
  }
};
