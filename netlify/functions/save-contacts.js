import { getStore } from '@netlify/blobs';

function csvToJson(csv) {
  // CSV -> array of objects (handles simple quoted fields)
  const rows = csv.replace(/\r/g,'').split('\n').filter(Boolean);
  if (!rows.length) return [];
  const parse = (line) => {
    const out = []; let cur = ''; let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' ) { q = !q; continue; }
      if (ch === ',' && !q) { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    out.push(cur);
    return out.map(s => s.trim());
  };
  const header = parse(rows[0]).map(h => h.toLowerCase().replace(/\s+/g,'_'));
  return rows.slice(1).map(r => {
    const cols = parse(r); const obj = {};
    header.forEach((k, i) => { obj[k] = cols[i] ?? ''; });
    return obj;
  });
}

export default async (req) => {
  try {
    const admin = req.headers.get('x-admin-token');
    if (!admin || admin !== process.env.ADMIN_TOKEN) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    let contacts = [];

    if (contentType.includes('application/json')) {
      const body = await req.json();
      contacts = Array.isArray(body) ? body : (body.contacts ?? []);
    } else {
      // accept raw text (CSV)
      const text = await req.text();
      contacts = csvToJson(text);
    }

    // Normalize
    contacts = contacts.map((c, i) => ({
      id: c.id || String(i + 1),
      first_name: c.first_name || c.first || '',
      last_name: c.last_name || c.last || '',
      email: c.email || '',
      phone: c.phone || c.mobile || '',
      points: Number(c.points || 0),
      preferences: (c.preferences || c.favorite_brands || '')
        .split(/[;,]/).map(s=>s.trim()).filter(Boolean),
      last_purchase_brand: c.last_purchase_brand || '',
      last_purchase_item: c.last_purchase_item || '',
      notes: c.notes || '',
      ...c
    }));

    const store = getStore('contacts');
    await store.set('contacts.json', JSON.stringify(contacts));

    return new Response(JSON.stringify({ ok: true, count: contacts.length }), {
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'save-contacts failed', detail: String(e) }), { status: 500 });
  }
}
