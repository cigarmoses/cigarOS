// netlify/functions/get-data.js
/* GitHub-only data source:
   - Primary:   /img/inventory.csv  (in your repo)
   - Fallback:  /img/inventory.json (optional)
   No Netlify Blobs. No terminal needed.
*/

// CSV parser (same as in get-loyalty)
function parseCSV(text) {
  const rows = []; let i = 0, f = '', r = [], q = false;
  const pf = () => (r.push(f), f = '');
  const pr = () => (rows.push(r), r = []);
  while (i < text.length) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i += 2; continue; } q = false; i++; continue; } f += c; i++; continue; }
    if (c === '"') { q = true; i++; continue; }
    if (c === ',') { pf(); i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { pf(); pr(); i++; continue; }
    f += c; i++;
  }
  pf(); if (r.length) pr();
  if (!rows.length) return [];
  const headers = rows[0].map(h => (h || '').trim());
  return rows.slice(1).map(row => {
    const o = {};
    headers.forEach((k, idx) => (o[k] = row[idx] ?? ''));
    return o;
  });
}

const pick = (o, keys) => { for (const k of keys) if (k in o && String(o[k]).trim() !== '') return o[k]; return ''; };
const slugify = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function normalizeItem(raw, idx) {
  const brand   = pick(raw, ['brand','Brand','Manufacturer']) || '';
  const item    = pick(raw, ['item','Item','name','Name','Cigar']) || '';
  const vitola  = pick(raw, ['vitola','Vitola','Size']) || '';
  const price   = Number(pick(raw, ['price','Price'])) || 0;
  const stock   = Number(pick(raw, ['inventory','Inventory','Qty','Stock'])) || 0;
  const slug    = pick(raw, ['brand_slug','Brand Slug','brandSlug']) || slugify(brand);
  const icon    = pick(raw, ['brand_icon','Brand Icon','icon']) || (slug ? `/img/brands/${slug}.svg` : '/img/placeholder.svg');

  return {
    id: String(pick(raw, ['id','ID','Sku','SKU']) || idx + 1),
    brand, item, vitola,
    price, inventory: stock,
    brand_slug: slug, brand_icon: icon,
    _raw: raw
  };
}

async function loadInventoryFromCSV() {
  const url = new URL('../../img/inventory.csv', import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error('inventory.csv not found in /img');
  const txt = await res.text();
  const rows = parseCSV(txt);
  return rows.map(normalizeItem);
}

async function loadInventoryFromJSONFallback() {
  const url = new URL('../../img/inventory.json', import.meta.url);
  const res = await fetch(url);
  if (!res.ok) return [];
  const arr = await res.json();
  return (Array.isArray(arr) ? arr : []).map((it, i) => normalizeItem(it, i));
}

export default async () => {
  try {
    let items = [];
    try {
      items = await loadInventoryFromCSV();
    } catch {
      items = await loadInventoryFromJSONFallback();
    }
    if (!items.length) throw new Error('No inventory found');
    return new Response(JSON.stringify({ ok: true, source: 'repo', items }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Failed to load inventory' }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
};
