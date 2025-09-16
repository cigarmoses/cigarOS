// netlify/functions/get-loyalty.js
import { getStore } from '@netlify/blobs';

/**
 * Some CSV->JSON converters leave NaN/Infinity in the text.
 * Replace with null before JSON.parse.
 */
function sanitizeJsonText(text) {
  return text
    .replace(/:\s*NaN\b/g, ': null')
    .replace(/:\s*Infinity\b/g, ': null')
    .replace(/:\s*-Infinity\b/g, ': null');
}

/** Small, quote-aware CSV parser (handles commas inside quotes) */
function parseCSV(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;

  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { rows.push(row); row = []; };

  while (i < text.length) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; } // escaped quote
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    } else {
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ',') { pushField(); i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { pushField(); pushRow(); i++; continue; }
      field += c; i++; continue;
    }
  }
  // last field/row
  pushField();
  if (row.length > 1 || (row.length === 1 && row[0] !== '')) pushRow();

  if (rows.length === 0) return [];
  const headers = rows[0].map(h => (h || '').trim());
  return rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = r[idx] ?? ''; });
    return obj;
  });
}

/** Map a record's value by any of several header candidates */
function pick(obj, candidates) {
  for (const key of candidates) {
    if (obj[key] != null && String(obj[key]).trim() !== '') return obj[key];
  }
  return '';
}

/** Normalize one raw record into stable keys the UI expects */
function normalizeRecord(raw) {
  const last = pick(raw, ['Last Name','Last','last','LName']);
  const first = pick(raw, ['First Name','First','first','FName']);
  const aka = pick(raw, ['Nickname “aka”','Nickname "aka"','aka','AKA','Nick','Nickname']);
  const points = pick(raw, ['Points','Rewards','Pts','points']);
  const lastPurchase = pick(raw, ['Last Purchase','Last purchase','Last','Last Visit','Last visit']);
  const notes = pick(raw, ['Notes','Note','notes']);
  const locker = pick(raw, ['Locker #','Locker','Locker Number','Locker#']);
  const regular = pick(raw, ['Regular','regular']);
  const email = pick(raw, ['Email','email','E-mail']);
  const phone = pick(raw, ['Phone','phone','Mobile','Cell']);
  const birthday = pick(raw, ['Birthday','DOB','Birthdate']);

  // numeric points
  let pointsNum = Number(points);
  if (!Number.isFinite(pointsNum)) {
    // allow 7.4k style
    const m = String(points).trim().match(/^(\d+(?:\.\d+)?)k$/i);
    if (m) pointsNum = Math.round(parseFloat(m[1]) * 1000);
    else pointsNum = 0;
  }

  return {
    first: String(first || '').trim(),
    last: String(last || '').trim(),
    aka: String(aka || '').trim(),
    points: pointsNum,
    lastPurchase: String(lastPurchase || '').trim(),
    notes: String(notes || '').trim(),
    locker: String(locker || '').trim(),     // any non-empty → is locker
    regular: String(regular || '').trim(),   // any non-empty → is regular
    email: String(email || '').trim(),
    phone: String(phone || '').trim(),
    birthday: String(birthday || '').trim(),
    _raw: raw
  };
}

export default async () => {
  try {
    const store = getStore('contacts');

    // 1) Try JSON blob
    let text = await store.get('contacts.json', { type: 'text' });
    let records = [];
    if (text) {
      const safe = sanitizeJsonText(text);
      const arr = JSON.parse(safe);
      if (Array.isArray(arr)) records = arr.map(normalizeRecord);
    }

    // 2) If no JSON found, try CSV blob
    if (!records.length) {
      const csvText = await store.get('contacts.csv', { type: 'text' });
      if (csvText) {
        const arr = parseCSV(csvText);
        records = arr.map(normalizeRecord);
      }
    }

    if (!records.length) {
      throw new Error('No contacts found in Blobs (expected contacts.json or contacts.csv)');
    }

    return new Response(JSON.stringify({ ok: true, source: 'blobs', data: records }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (err) {
    // Last-chance fallback: /img/contacts.json (optional)
    try {
      const url = new URL('../../img/contacts.json', import.meta.url);
      const res = await fetch(url);
      const arr = await res.json();
      const records = (Array.isArray(arr) ? arr : []).map(normalizeRecord);
      return new Response(JSON.stringify({ ok: true, source: 'fallback', data: records }), {
        headers: { 'content-type': 'application/json' }
      });
    } catch (fallbackErr) {
      return new Response(
        JSON.stringify({ ok: false, error: err?.message || 'Unable to load contacts' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
  }
};
