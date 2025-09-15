// netlify/functions/get-loyalty.js
import { getStore } from '@netlify/blobs';

// Clean up NaN/Infinity so JSON stays valid
function sanitizeJsonText(text) {
  return text
    .replace(/:\s*NaN\b/g, ': null')
    .replace(/:\s*Infinity\b/g, ': null')
    .replace(/:\s*-Infinity\b/g, ': null');
}

function deepClean(value) {
  if (Array.isArray(value)) return value.map(deepClean);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepClean(v);
    return out;
  }
  if (typeof value === 'number' && Number.isNaN(value)) return null;
  if (value === undefined) return null;
  return value;
}

export default async () => {
  try {
    // Primary: pull from Netlify Blobs
    const store = getStore('contacts');
    const raw = await store.get('contacts.json', { type: 'text' });
    if (!raw) throw new Error('No data found in Blobs');

    const safe = sanitizeJsonText(raw);
    const data = deepClean(JSON.parse(safe));

    return new Response(JSON.stringify({ ok: true, source: 'blobs', data }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (err) {
    // Fallback to /img/contacts.json if Blobs fails
    try {
      const url = new URL('../../img/contacts.json', import.meta.url);
      const res = await fetch(url);
      const data = await res.json();

      return new Response(JSON.stringify({ ok: true, source: 'fallback', data }), {
        headers: { 'content-type': 'application/json' }
      });
    } catch (fallbackErr) {
      return new Response(
        JSON.stringify({ ok: false, error: fallbackErr.message }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
  }
};
