// netlify/functions/get-data.js
import { getStore } from '@netlify/blobs';

export default async () => {
  try {
    const store = getStore('inventory');

    // Prefer Blobs /inventory/inventory.json; else fallback to repo /img/inventory.json
    let source = 'blobs';
    let text = await store.get('inventory.json', { type: 'text' });
    if (!text) {
      const url = new URL('../../img/inventory.json', import.meta.url);
      const res = await fetch(url);
      if (!res.ok) throw new Error('No inventory.json found in blobs or /img');
      text = await res.text();
      source = 'repo';
    }

    const input = JSON.parse(text);
    const items = (Array.isArray(input) ? input : []).map((it, i) => {
      const out = { id: it.id ?? String(i + 1), ...it };
      // normalize
      out.brand = out.brand ?? '';
      out.item = out.item ?? '';
      out.vitola = out.vitola ?? '';
      out.price = Number(out.price ?? 0);
      out.inventory = Number(out.inventory ?? 0);

      // compute brand icon if missing
      if (!out.brand_icon) {
        const slug = (out.brand_slug || String(out.brand || '').toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''));
        out.brand_icon = slug ? `/img/brands/${slug}.svg` : '/img/placeholder.svg';
      }
      return out;
    });

    return new Response(JSON.stringify({ ok: true, source, items }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Failed to load inventory' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
