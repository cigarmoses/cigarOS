// netlify/functions/update-points.js
import { getStore } from '@netlify/blobs';

/**
 * CORS helper (so you can POST from the browser)
 */
function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'content-type': 'application/json'
  };
}

function ok(body) {
  return new Response(JSON.stringify(body), { headers: corsHeaders() });
}
function bad(status, message) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: corsHeaders()
  });
}

// Replace invalid JSON tokens (NaN/Infinity) with null
function sanitizeJsonText(text) {
  return text
    .replace(/:\s*NaN\b/g, ': null')
    .replace(/:\s*Infinity\b/g, ': null')
    .replace(/:\s*-Infinity\b/g, ': null');
}

export default async (req) => {
  if (req.method === 'OPTIONS') return ok({ ok: true });
  if (req.method !== 'POST') return bad(405, 'Method not allowed');

  let payload;
  try {
    payload = await req.json();
  } catch {
    return bad(400, 'Invalid JSON body');
  }

  // Accept several IDs; email is preferred.
  const {
    email,
    lastName,
    firstName,
    aka,              // Nickname “aka”
    points            // new points value (number or numeric string)
  } = payload || {};

  // Validate input
  const num = Number(points);
  if (!Number.isFinite(num) || num < 0) {
    return bad(400, 'Points must be a non-negative number');
  }
  if (!email && !(lastName && firstName)) {
    return bad(400, 'Provide email OR firstName + lastName (aka optional)');
  }

  try {
    const store = getStore('contacts');

    // Load contacts.json from Blobs as text then parse
    const raw = await store.get('contacts.json', { type: 'text' });
    if (!raw) return bad(500, 'contacts.json not found in Blobs');

    const data = JSON.parse(sanitizeJsonText(raw));
    if (!Array.isArray(data)) return bad(500, 'contacts.json is not an array');

    // Case-insensitive matcher
    const norm = (v) => (v ?? '').toString().trim().toLowerCase();
    const targetEmail = norm(email);
    const targetLast  = norm(lastName);
    const targetFirst = norm(firstName);
    const targetAka   = norm(aka);

    // Find best match: by email first, then by name(+aka if provided).
    let idx = -1;
    if (targetEmail) {
      idx = data.findIndex(r => norm(r['Email']) === targetEmail);
    }
    if (idx === -1) {
      idx = data.findIndex(r => {
        const sameName = norm(r['Last Name']) === targetLast &&
                         norm(r['First Name']) === targetFirst;
        if (!sameName) return false;
        // If aka provided, require it; otherwise ignore aka in match
        return targetAka ? norm(r['Nickname “aka”']) === targetAka : true;
      });
    }

    if (idx === -1) {
      return bad(404, 'Customer not found (check email/name/aka)');
    }

    // Update points
    const before = data[idx];
    data[idx]['Points'] = num;

    // Save back to Blobs as JSON
    const bodyText = JSON.stringify(data, null, 2);
    await store.set('contacts.json', bodyText, {
      contentType: 'application/json; charset=utf-8'
    });

    return ok({
      ok: true,
      updated: {
        identifier: email || `${before['First Name']} ${before['Last Name']}${before['Nickname “aka”'] ? ` (${before['Nickname “aka”']})` : ''}`,
        points: num
      }
    });
  } catch (err) {
    return bad(500, err?.message || 'Unknown error');
  }
};
