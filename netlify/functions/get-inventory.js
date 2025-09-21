// /netlify/functions/get-inventory.js
// Read the latest CSV from Blobs store "inventory" and return CSV or JSON.

async function getBlobs() {
  const mod = await import('@netlify/blobs');
  return mod;
}

exports.handler = async (event) => {
  try {
    const { getStore } = await getBlobs();
    const store = getStore('inventory');

    const params = new URL(event.rawUrl || `https://x${event.path}`).searchParams;
    const format = (params.get('format') || 'json').toLowerCase(); // 'json' | 'csv'

    const csv = await store.get('inventory.csv', { type: 'text' });
    if (!csv) {
      return j({ ok:false, error:'No inventory.csv found in Blobs store "inventory". Upload one at /.netlify/functions/set-inventory' }, 404);
    }

    if (format === 'csv') {
      return {
        statusCode: 200,
        headers: { 'content-type':'text/csv; charset=utf-8', 'cache-control':'no-store' },
        body: csv
      };
    }

    // JSON
    const rows = parseCSV(csv);
    const out = rowsToObjects(rows);
    return j({ ok:true, source:'blobs', rows: out });

  } catch (err) {
    return j({ ok:false, error: err.message }, 500);
  }
};

/* --- helpers --- */

// Basic CSV parser that understands quoted fields ("" escapes)
function parseCSV(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;

  while (i < text.length) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i+1] === '"') { field += '"'; i += 2; continue; } // escaped quote
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }

    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }

    field += c; i++;
  }
  // last field
  row.push(field);
  rows.push(row);
  // Trim any trailing empty rows
  return rows.filter(r => r.some(cell => String(cell).trim() !== ''));
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(h => (h||'').trim());
  const data = rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = r[idx] ?? ''; });
    return obj;
  });
  return data;
}

function j(obj, statusCode = 200) {
  return {
    statusCode,
    headers: { 'content-type':'application/json; charset=utf-8', 'access-control-allow-origin':'*' },
    body: JSON.stringify(obj)
  };
}
