// Dependency-free CSV reader for Loyalty
// Reads contacts.csv from Netlify Blobs store "contacts" and returns normalized JSON.
import { getStore } from '@netlify/blobs';

/** Simple CSV parser that handles quoted fields and commas inside quotes. */
function parseCSV(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;

  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { rows.push(row); row = []; };

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // Lookahead for escaped double-quote
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }

    // not in quotes
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { pushField(); i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { pushField(); pushRow(); i++; continue; }

    field += ch; i++;
  }
  // flush last field/row if any content remains
  if (field.length || row.length) { pushField(); pushRow(); }

  return rows;
}

function truthy(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === 'y' || s === 'yes' || s === 'x' || s === 'true' || s === '1';
}

function toDateOrEmpty(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  // let the client format the date; we just echo the raw string
  return s;
}

export default async (req, context) => {
  try {
    // 1) Read CSV from Netlify Blobs
    const store = getStore('contacts');
    const csv = await store.get('contacts.csv', { type: 'text' });

    if (!csv) {
      return new Response(JSON.stringify({ ok: false, error: 'contacts.csv not found in blobs "contacts"' }), {
        status: 404,
        headers: { 'content-type': 'application/json' }
      });
    }

    // 2) Parse CSV
    const rows = parseCSV(csv);
    if (!rows.length) {
      return new Response(JSON.stringify({ ok: false, error: 'CSV is empty' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    // 3) Normalize headers
    const headers = rows[0].map(h => String(h || '').trim());
    const idx = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());

    const col = {
      locker: idx('Locker') !== -1 ? idx('Locker') : idx('Locker #'),
      regular: idx('Regular'),
      military: idx('Military'),
      responder: idx('First Responder'),
      rewards: idx('Rewards'),
      lastName: idx('Last Name'),
      firstName: idx('First Name'),
      aka: idx('Nickname “aka”') !== -1 ? idx('Nickname “aka”') : idx('Nickname "aka"') !== -1 ? idx('Nickname "aka"') : idx('aka'),
      lastPurchase: idx('Last Purchase'),
      email: idx('Email'),
      phone: idx('Phone'),
      birthday: idx('Birthday'),
      ytd: idx('YTD spend'),
      visits90: idx('90-day visits'),
      giftCard: idx('Gift card balance'),
      ringPref: idx('Ring Pref'),
      brand1: idx('Fav brand 1'),
      brand2: idx('Fav brand 2'),
      brand3: idx('Fav brand 3'),
      fav1: idx('Fav cigar'),
      fav2: idx('Fav cigar 2'),
      fav3: idx('Fav cigar 3'),
      company: idx('Company'),
      labels: idx('Labels'),
      notes: idx('Notes')
    };

    // 4) Convert rows to objects
    const out = [];
    for (let r = 1; r < rows.length; r++) {
      const c = rows[r];

      // skip empty lines
      if (!c || c.every(x => (x ?? '').toString().trim() === '')) continue;

      const first = col.firstName >= 0 ? c[col.firstName] : '';
      const last = col.lastName >= 0 ? c[col.lastName] : '';
      const id = String(r); // simple stable id per row

      const entry = {
        id,
        first_name: String(first || '').trim(),
        last_name: String(last || '').trim(),
        aka: col.aka >= 0 ? String(c[col.aka] || '').trim() : '',
        email: col.email >= 0 ? String(c[col.email] || '').trim() : '',
        phone: col.phone >= 0 ? String(c[col.phone] || '').trim() : '',
        birthday: col.birthday >= 0 ? String(c[col.birthday] || '').trim() : '',
        points: Number(col.rewards >= 0 ? (c[col.rewards] || 0) : 0) || 0,
        lastPurchase: toDateOrEmpty(col.lastPurchase >= 0 ? c[col.lastPurchase] : ''),
        ytd: col.ytd >= 0 ? String(c[col.ytd] || '').trim() : '',
        visits90: col.visits90 >= 0 ? String(c[col.visits90] || '').trim() : '',
        gift_card_balance: col.giftCard >= 0 ? String(c[col.giftCard] || '').trim() : '',
        preferences: {
          ring_pref: col.ringPref >= 0 ? String(c[col.ringPref] || '').trim() : '',
          fav_brand_1: col.brand1 >= 0 ? String(c[col.brand1] || '').trim() : '',
          fav_brand_2: col.brand2 >= 0 ? String(c[col.brand2] || '').trim() : '',
          fav_brand_3: col.brand3 >= 0 ? String(c[col.brand3] || '').trim() : '',
          fav_cigar_1: col.fav1 >= 0 ? String(c[col.fav1] || '').trim() : '',
          fav_cigar_2: col.fav2 >= 0 ? String(c[col.fav2] || '').trim() : '',
          fav_cigar_3: col.fav3 >= 0 ? String(c[col.fav3] || '').trim() : ''
        },
        company: col.company >= 0 ? String(c[col.company] || '').trim() : '',
        labels: col.labels >= 0 ? String(c[col.labels] || '').trim() : '',
        badges: {
          locker: truthy(col.locker >= 0 ? c[col.locker] : ''),
          military: truthy(col.military >= 0 ? c[col.military] : ''),
          responder: truthy(col.responder >= 0 ? c[col.responder] : ''),
          // "Regular" is not a badge; your UI uses row shading for locker vs non-locker
        },
        // keep raw row if you want to debug later
        _raw: undefined
      };

      out.push(entry);
    }

    return new Response(JSON.stringify({ ok: true, source: 'blobs-csv', count: out.length, data: out }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err && err.message || err) }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
