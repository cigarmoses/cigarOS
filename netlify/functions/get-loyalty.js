// netlify/functions/get-loyalty.js
// ESM (package.json has "type":"module")

import { getStore } from '@netlify/blobs';

export default async (req) => {
  try {
    // Read the "contacts" store and the single JSON document
    const store = getStore('contacts');
    const txt = await store.get('contacts.json');

    // If the blob isn't set yet, return empty array
    const data = txt ? JSON.parse(txt) : [];

    return new Response(JSON.stringify({ ok: true, data }), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
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
