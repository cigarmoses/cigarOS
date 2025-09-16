// netlify/functions/get-data.js
import { getStore } from '@netlify/blobs';

export default async () => {
  try {
    const store = getStore('inventory');

    // 1) Try Blobs: inventory/inventory.json
    let src = 'blobs';
    let text = await store.get('inventory.json', { type: 'text' });

    // 2) Fallback to repo file /img/inventory.json
    if (!text) {
      const url = new URL('../../img/inventory.json', import.meta.url);
      const res = await fetch(url);
      if (!res.ok) throw new Error('No inventory.json found in blobs or /img');
      text = await res.text();
      src = 'repo';
    }

    const items = JSON.parse(text);

    // Normalize brand icon path if you give us brand_slug
    const normalized = items.map((it, i) => {
      const out = { id: it.id ?? String(i + 1), ...it };
      if (!out.brand_icon && out.brand_slug) {
        out.brand_icon = `/img/brands/${out.brand_slug}.svg`;
      }
      // Ensure required fields exist to avoid UI crashes
      out.brand = out.brand ?? '';
      out.item = out.item ?? '';
      out.vitola = out.vitola ?? '';
      out.price = Number(out.price ?? 0);
      out.inventory = Number(out.inventory ?? 0);
      return out;
    });

    return new Response(JSON.stringify({ ok: true, source: src, items: normalized }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Failed to load inventory' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
