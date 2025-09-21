// /netlify/functions/set-inventory.js
// Upload & save the latest inventory CSV to Netlify Blobs (store: "inventory")

// NOTE: We use a dynamic import so this works even if your site isn't "type: module".
async function getBlobs() {
  const mod = await import('@netlify/blobs');
  return mod;
}

const HTML = (body) => `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Upload Inventory CSV</title>
  <style>
    :root{
      --card:#fff; --bg:#f6f7f9; --text:#0f172a; --muted:#475569; --blue:#1DA1F2;
    }
    html,body{margin:0;padding:0;background:var(--bg);color:var(--text);font:16px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Helvetica,Arial,sans-serif}
    .wrap{max-width:900px;margin:28px auto;padding:0 16px}
    .card{background:var(--card);border-radius:14px;box-shadow:0 8px 24px rgba(15,23,42,.06);padding:22px}
    h1{font-size:28px;margin:0 0 18px}
    .row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:10px 0 18px}
    input[type="file"]{padding:6px 10px}
    button{background:var(--blue);color:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:600;cursor:pointer}
    button[disabled]{opacity:.6;cursor:not-allowed}
    .small{color:var(--muted);font-size:13px;margin-top:-8px}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th,td{border-bottom:1px solid #e5e7eb;padding:10px 8px;text-align:left;font-size:14px}
    th{font-weight:700;background:#f8fafc}
    .links{display:flex;gap:14px;margin-top:14px}
    a{color:#0ea5e9;text-decoration:none}
    a:hover{text-decoration:underline}
    .status{margin-top:10px;font-size:14px}
    .ok{color:#16a34a} .err{color:#dc2626}
    .note{margin-top:10px;color:var(--muted);font-size:13px}
    .tag{display:inline-block;padding:2px 8px;border-radius:999px;background:#eef2ff;color:#4338ca;font-size:12px;margin-left:6px}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Upload Inventory CSV <span class="tag">no terminal needed</span></h1>
      <p class="small">Pick your latest CSV and click <strong>Save to Netlify</strong>. The POS will always use the newest file (no redeploy needed).</p>

      <div class="row">
        <input id="file" type="file" accept=".csv" />
        <button id="save" disabled>Save to Netlify</button>
      </div>

      <div id="meta" class="small"></div>

      <div id="preview"></div>

      <div class="links">
        <a href="/.netlify/functions/get-inventory?format=csv" target="_blank">View current saved CSV</a>
        <a href="/.netlify/functions/get-inventory" target="_blank">View JSON API</a>
      </div>

      <div id="status" class="status"></div>
      <div class="note">If you see any error, ensure your Netlify build finished successfully. No local install is required—this page talks directly to your Netlify Function.</div>
    </div>
  </div>

<script>
  const fileEl = document.getElementById('file');
  const saveBtn = document.getElementById('save');
  const meta = document.getElementById('meta');
  const statusEl = document.getElementById('status');
  const preview = document.getElementById('preview');

  let csvText = '';

  fileEl.addEventListener('change', async (e) => {
    statusEl.textContent = '';
    preview.innerHTML = '';
    const f = e.target.files && e.target.files[0];
    if (!f) { saveBtn.disabled = true; return; }

    const text = await f.text();
    csvText = text;
    saveBtn.disabled = false;
    meta.textContent = \`Selected: \${f.name} • \${(f.size/1024).toFixed(1)} KB\`;

    const rows = text.split(/\\r?\\n/).slice(0, 16).filter(Boolean).map(r => r.split(','));
    if (!rows.length) return;

    const thead = rows[0];
    const rest = rows.slice(1);

    const tbl = document.createElement('table');
    const th = document.createElement('thead');
    th.innerHTML = '<tr>' + thead.map(h => '<th>'+escapeHtml(h)+'</th>').join('') + '</tr>';
    tbl.appendChild(th);

    const tb = document.createElement('tbody');
    rest.forEach(r=>{
      const tr = document.createElement('tr');
      tr.innerHTML = r.map(c => '<td>'+escapeHtml(c)+'</td>').join('');
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    const h3 = document.createElement('h3'); h3.textContent = 'Preview (first 15 rows)';
    preview.appendChild(h3);
    preview.appendChild(tbl);
  });

  saveBtn.addEventListener('click', async () => {
    if (!csvText) return;
    saveBtn.disabled = true;
    statusEl.textContent = 'Saving…';

    try {
      const res = await fetch('/.netlify/functions/set-inventory?save=1', {
        method: 'POST',
        headers: {'content-type':'text/plain'},
        body: csvText
      });
      const json = await res.json();
      if (json.ok) {
        statusEl.innerHTML = '<span class="ok">Saved to Netlify Blobs ✔</span>';
      } else {
        statusEl.innerHTML = '<span class="err">Error: '+escapeHtml(json.error||'unknown')+'</span>';
      }
    } catch (err) {
      statusEl.innerHTML = '<span class="err">Error: '+escapeHtml(err.message)+'</span>';
    } finally {
      saveBtn.disabled = false;
    }
  });

  function escapeHtml(s){return (s||'').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]))}
</script>
</body>
</html>
`;

exports.handler = async (event) => {
  try {
    const { getStore } = await getBlobs();
    const store = getStore('inventory');

    // POST (or GET with ?save=1): save incoming CSV text
    const url = new URL(event.rawUrl || `https://x${event.path}`);
    const isSave = url.searchParams.get('save') === '1' && event.httpMethod === 'POST';

    if (isSave) {
      const csvText = event.body || '';
      if (!csvText.trim()) {
        return json({ ok:false, error:'Empty CSV' }, 400);
      }
      await store.set('inventory.csv', csvText, { contentType: 'text/csv' });
      return json({ ok:true, savedKey: 'inventory.csv' });
    }

    // GET: return the upload UI
    return html(HTML());

  } catch (err) {
    return json({ ok:false, error: err.message }, 500);
  }
};

/* helpers */
function html(markup) {
  return {
    statusCode: 200,
    headers: { 'content-type':'text/html; charset=utf-8', 'cache-control':'no-store' },
    body: markup
  };
}
function json(obj, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'content-type':'application/json; charset=utf-8',
      'access-control-allow-origin':'*'
    },
    body: JSON.stringify(obj)
  };
}
