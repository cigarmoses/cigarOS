export async function handler() {
  try {
    // Always load from GitHub repo (no Netlify blobs fallback)
    const url = new URL('../../img/contacts.csv', import.meta.url);
    const res = await fetch(url);
    if (!res.ok) throw new Error('CSV not found');
    const text = await res.text();

    // Parse CSV
    const rows = text.split('\n').map(r => r.split(','));
    const headers = rows.shift().map(h => h.trim().toLowerCase());

    const data = rows.map((row, i) => {
      const obj = {};
      headers.forEach((h, j) => obj[h] = (row[j] || '').trim());

      // Normalize fields
      return {
        id: i + 1,
        first: obj['first name'] || '',
        last: obj['last name'] || '',
        points: Number(obj['rewards'] || 0),
        lastPurchase: obj['last purchase'] || '',
        email: obj['email'] || '',
        phone: obj['phone'] || '',
        // Badge icons
        badges: {
          military: /y|yes|x/i.test(obj['military'] || ''),
          responder: /y|yes|x/i.test(obj['first responder'] || ''),
          locker: /y|yes|x/i.test(obj['locker member'] || '')
        }
      };
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, source: 'repo-csv', data })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
}
