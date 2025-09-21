// Upload & save the latest inventory CSV to Netlify Blobs (store: "inventory")

async function getBlobs() { return await import('@netlify/blobs'); }

// Resolve a blobs store, automatically in Netlify, or manually via env vars (SITE_ID/BLOBS_TOKEN)
async function resolveStore(name) {
  const { getStore } = await getBlobs();
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const token  = process.env.NETLIFY_BLOBS_CONTEXT ? undefined : (process.env.BLOBS_TOKEN || process.env.NETLIFY_API_TOKEN);
  return token && siteID ? getStore({ name, siteID, token }) : getStore(name);
}

const HTML = () => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Upload Inventory CSV</title>
<style>
:root{--card:#fff;--bg:#f6f7f9;--text:#0f172a;--muted:#475569;--blue:#1DA1F2}
html,body{margin:0;padding:0;background:var(--bg);color:var(--text);font:16px/1.45 -apple-system,BlinkMacSystemFont,Segoe UI,Inter,Roboto,Helvetica,Arial,sans-serif}
.wrap{max-width:900px;margin:28px auto;padding:0 16px}
.card{background:var(--card);border-radius:14px;box-shadow:0 8px 24px rgba(15,23,42,.06);padding:22px}
h1{font-size:28px;margin:0 0 14px}
.row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:8px 0 14px}
button{background:var(--blue);color:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}
button[disabled]{opacity:.6;cursor:not-allowed}
.small{color:var(--muted);font-size:13px;margin-top:-6px}
table{width:100%;border-collapse:collapse;margin-top:12px}
th,td{border-bottom:1px solid #e5e7eb;padding:10px 8px;text-align:left;font-size:14px}
th{font-weight:700;background:#f8fafc}
.links{display:flex;gap:14px;margin-top:14px}
a{color:#0ea5e9;text-decoration:none} a:hover{text-decoration:underline}
.status{margin-top:10px;font-size:14px}.ok{color:#16a34a}.err{color:#dc2626}
.tag{display:inline-block;padding:2px 8px;border-radius:999px;background:#eef2ff;color:#4338ca;font-size:12px;margin-left:6px}
</style></head>
<body><div class="wrap"><div class="card">
  <h1>Upload Inventory CSV <span class="tag">no terminal needed</span></h1>
  <p class="small">Pick your latest CSV and click <b>Save to Netlify</b>. The POS will always use the newest file.</p>
  <div class="row">
    <input id="file" type="file" accept=".csv"/>
    <button id="save" disabled>Save to Netlify</button>
  </div>
  <div id="meta" class="small"></div>
  <div id="preview"></div>
  <div class="links">
    <a href="/.netlify/functions/get-inventory?format=csv" target="_blank">View current saved CSV</a>
    <a href="/.netlify/functions/get-inventory" target="_blank">View JSON API</a>
  </div>
  <div id="status" class="status"></div>
</div></div>
<script>
const fileEl=document.getElementById('file');
const saveBtn=document.getElementById('save');
const meta=document.getElementById('meta');
const preview=document.getElementById('preview');
const statusEl=document.getElementById('status');
let csvText='';

fileEl.addEventListener('change', async (e)=>{
  statusEl.textContent=''; preview.innerHTML='';
  const f=e.target.files && e.target.files[0]; if(!f){saveBtn.disabled=true; return;}
  csvText=await f.text(); saveBtn.disabled=false;
  meta.textContent=\`Selected: \${f.name} • \${(f.size/1024).toFixed(1)} KB\`;

  const rows=csvText.split(/\\r?\\n/).slice(0,16).filter(Boolean).map(r=>r.split(','));
  if(!rows.length) return;
  const thead=rows[0], rest=rows.slice(1);
  const tbl=document.createElement('table');
  const th=document.createElement('thead'); th.innerHTML='<tr>'+thead.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr>'; tbl.appendChild(th);
  const tb=document.createElement('tbody');
  rest.forEach(r=>{const tr=document.createElement('tr'); tr.innerHTML=r.map(c=>'<td>'+esc(c)+'</td>').join(''); tb.appendChild(tr);});
  tbl.appendChild(tb); const h3=document.createElement('h3'); h3.textContent='Preview (first 15 rows)';
  preview.append(h3,tbl);
});
saveBtn.addEventListener('click', async ()=>{
  if(!csvText) return; saveBtn.disabled=true; statusEl.textContent='Saving…';
  try{
    const res=await fetch('/.netlify/functions/set-inventory?save=1',{method:'POST',headers:{'content-type':'text/plain'},body:csvText});
    const json=await res.json();
    statusEl.innerHTML=json.ok?'<span class="ok">Saved to Netlify Blobs ✔</span>':'<span class="err">Error: '+esc(json.error||'unknown')+'</span>';
  }catch(err){ statusEl.innerHTML='<span class="err">Error: '+esc(err.message)+'</span>'; }
  finally{ saveBtn.disabled=false; }
});
function esc(s){return (s||'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]))}
</script>
</body></html>`;

exports.handler = async (event) => {
  try {
    const store = await resolveStore('inventory');

    const url = new URL(event.rawUrl || `https://x${event.path}`);
    const saving = url.searchParams.get('save') === '1' && event.httpMethod === 'POST';

    if (saving) {
      const csv = event.body || '';
      if (!csv.trim()) return j({ ok:false, error:'Empty CSV' }, 400);
      await store.set('inventory.csv', csv, { contentType:'text/csv' });
      return j({ ok:true });
    }

    return h(HTML());
  } catch (err) {
    return j({ ok:false, error: err.message }, 500);
  }
};

/* helpers */
function h(body){return{statusCode:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'},body}}
function j(obj,code=200){return{statusCode:code,headers:{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*'},body:JSON.stringify(obj)}}
