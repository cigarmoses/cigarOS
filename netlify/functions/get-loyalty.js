export default async () => {
  try {
    // Try to load from Netlify Blobs
    const store = 'contacts';
    const key = 'contacts.csv';

    const { blobs } = await import('@netlify/blobs');

    const blob = await blobs.get(store, key);
    if (!blob) {
      return new Response(JSON.stringify({ ok: false, error: 'No contacts.csv found' }), {
        headers: { 'content-type': 'application/json' }
      });
    }

    const text = await blob.text();

    // Parse CSV
    const rows = text.split(/\r?\n/).filter(r => r.trim() !== '');
    const headers = rows[0].split(',').map(h => h.trim().toLowerCase());

    const data = rows.slice(1).map((row, i) => {
      const cols = row.split(',');
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = cols[idx] || '';
      });

      // Normalize to what the UI expects
      return {
        id: i + 1,
        first: obj['first name'] || obj['first_name'] || '',
        last: obj['last name'] || obj['last_name'] || '',
        aka: obj['nickname aka'] || obj['aka'] || '',
        points: obj['rewards'] || 0,
        lastPurchase: obj['last purchase'] || obj['last_purchase'] || '',
        notes: obj['notes'] || '',
        locker: obj['locker #'] || obj['locker'] || '',
        regular: obj['regular'] || '',
        email: obj['email'] || '',
        phone: obj['phone'] || '',
        raw: obj // keep everything just in case
      };
    });

    return new Response(JSON.stringify({ ok: true, source: 'blobs-csv', data }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      headers: { 'content-type': 'application/json' }
    });
  }
};
