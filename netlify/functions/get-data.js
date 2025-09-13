// netlify/functions/get-data.js
import { getStore } from '@netlify/blobs';

// Public read: returns [{brand,item,vitola,price,inventory,icon}, ...]
export default async () => {
  const store = getStore('smokepos');
  // Try the main key you’ve been using; fallbacks included
  const keys = ['inventory', 'data', 'pos-data', 'smoke-pos-data'];

  let rows = [];
  for (const key of keys) {
    try {
      const arr = await store.get(key, { type: 'json' });
      if (Array.isArray(arr) && arr.length) { rows = arr; break; }
    } catch {}
  }

  return new Response(JSON.stringify(rows || []), {
    headers: { 'Content-Type': 'application/json' }
  });
}
