import { getStore } from '@netlify/blobs';

export default async () => {
  try {
    const store = getStore('cigarhub'); // separate namespace
    const txt = await store.get('all.json');
    const body = txt || '[]';
    return new Response(body, {
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'get-hub failed', detail: String(e) }), { status: 500 });
  }
};
