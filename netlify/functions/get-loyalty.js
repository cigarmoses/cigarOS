// netlify/functions/get-loyalty.js
// Works on Netlify Functions with @netlify/blobs getStore() API.
// Reads contacts.json OR contacts.csv from the "contacts" store,
// normalizes headers (first_name/last_name/etc) to { first, last, ... }.

import { getStore } from '@netlify/blobs';

/* ---------- helpers ---------- */
function sanitizeJsonText(text) {
  return text
    .replace(/:\s*NaN\b/g, ': null')
    .replace(/:\s*Infinity\b/g, ': null')
    .replace(/:\s*-Infinity\b/g, ': null');
}

// CSV parser that handles quotes and commas inside quotes
function parseCSV(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;

  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { rows.push(row); row = []; };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
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
  pushField();
  if (row.length) pushRow();

  if (!rows.length) return [];
  const headers = rows[0].map(h => (h || '').trim());
  return rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = r[idx] ?? ''; });
    return obj;
  });
}

const pick = (obj, candidates) => {
  for (const k of candidates) {
    if (obj[k] != null && String(obj[k]).trim() !== '') return obj[k];
  }
  return '';
};

function findHeader(obj, token) {
  const t = token.toLowerCase();
  const keys = Object.keys(obj);
  const exact = keys.find(k => k.toLowerCase() === t || k.toLowerCase().includes(`${t} name`));
  if (exact) return exact;
  return keys.find(k => k.toLowerCase().includes(t)) || '';
}

function splitName(name) {
  const s = String(name || '').trim();
  if (!s) return { first: '', last: '' };
  if (s.includes(',')) {
    const [last, rest] = s.split(',').map(x => x.trim());
    return { first: rest || '', last: last || '' };
  }
  const parts = s.split(/\s+/);
  if (parts.length >= 2) {
    return { first: parts.slice(0, -1).join(' '), last: parts.slice(-1)[0] };
  }
  return { first: '', last: s };
}

// Normalize one raw record into the shape the UI expects
function normalizeRecord(raw) {
  // handle many spellings, including first_name/last_name seen in your blob
  let last  = pick(raw, ['Last Name','last_name','Last','LName']);
  let first = pick(raw, ['First Name','first_name','First','FName']);
  const nameField = pick(raw, ['Name','Full Name','Customer','Client']);

  if (!last)  { const k = findHeader(raw, 'last');  if (k) last  = raw[k]; }
  if (!first) { const k = findHeader(raw, 'first'); if (k) first = raw[k]; }

  if ((!first || !last) && nameField) {
    const sp = splitName(nameField);
    if (!first) first = sp.first;
    if (!last)  last  = sp.last;
  }

  const aka          = pick(raw, ['Nickname “aka”','Nickname "aka"','aka','AKA','Nick','Nickname']);
  const pointsRaw    = pick(raw, ['Points','Rewards','Pts','points','rewards']);
  const lastPurchase = pick(raw, ['Last Purchase','Last purchase','Last Visit','Last visit','Last','last_purchase']);
  const notes        = pick(raw, ['Notes','Note','notes']);
  const locker       = pick(raw, ['Locker #','Locker','Locker Number','Locker#','locker_#']);
  const regular      = pick(raw, ['Regular','regular']);
  const email        = pick(raw, ['Email','email','E-mail']);
  const phone        = pick(raw, ['Phone','phone','Mobile','Cell']);
  const birthday     = pick(raw, ['Birthday','DOB','Birthdate']);

  // numeric points (supports "7.4k")
  let points = Number(pointsRaw);
  if (!Number.isFinite(points)) {
    const m = String(pointsRaw).trim().match(/^(\d+(?:\.\d+)?)k$/i);
    points = m ? Math.round(parseFloat(m[1]) * 1000) : 0;
  }

  return {
    first: String(first || '').trim(),
    last: String(last || '').trim(),
    aka: String(aka || '').trim(),
    points,
    lastPurchase: String(lastPurchase || '').trim(),
    notes: String(notes || '').trim(),
    locker: String(locker || '').trim(),
    regular: String(regular || '').trim(),
    email: String(email || '').trim(),
    phone: String(phone || '').trim(),
    birthday: String(birthday || '').trim(),
    _raw: raw
  };
}

async function loadFromBlobs() {
  const store = getStore('contacts');
  if (!store) throw new Error('Netlify Blobs getStore() unavailable');

  // Prefer JSON if present
  const jsonText = await store.get('contacts.json', { type: 'text' });
  if (jsonText) {
    const arr = JSON.parse(sanitizeJsonText(jsonText));
    if (Array.isArray(arr)) return { source: 'blobs-json', data: arr.map(normalizeRecord) };
  }

  // Else try CSV
  const csvText = await store.get('contacts.csv', { type: 'text' });
  if (csvText) {
    const arr = parseCSV(csvText);
    return { source: 'blobs-csv', data: arr.map(normalizeRecord) };
  }

  return { source: 'none', data: [] };
}

export default async () => {
  try {
    let { source, data } = await loadFromBlobs();

    if (!data.length) {
      // Optional fallback to repo file
      try {
        const url = new URL('../../img/contacts.json', import.meta.url);
        const res = await fetch(url);
        const arr = await res.json();
        data = (Array.isArray(arr) ? arr : []).map(normalizeRecord);
        source = 'fallback';
      } catch {
        // ignore
      }
    }

    if (!data.length) throw new Error('No contacts found (blobs or fallback)');

    return new Response(JSON.stringify({ ok: true, source, data }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Unable to load contacts' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
