// Return inventory as JSON (default) or CSV (?format=csv)

async function getBlobs(){ return await import('@netlify/blobs'); }
async function resolveStore(name){
  const { getStore } = await getBlobs();
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const token  = process.env.NETLIFY_BLOBS_CONTEXT ? undefined : (process.env.BLOBS_TOKEN || process.env.NETLIFY_API_TOKEN);
  return token && siteID ? getStore({ name, siteID, token }) : getStore(name);
}

exports.handler = async (event) => {
  try {
    const store = await resolveStore('inventory');
    const params = new URL(event.rawUrl || `https://x${event.path}`).searchParams;
    const format = (params.get('format') || 'json').toLowerCase();

    const csv = await store.get('inventory.csv', { type:'text' });
    if (!csv) return J({ ok:false, error:'No inventory.csv found. Upload at /.netlify/functions/set-inventory' }, 404);

    if (format === 'csv') {
      return { statusCode:200, headers:{'content-type':'text/csv; charset=utf-8','cache-control':'no-store'}, body: csv };
    }

    const rows = parseCSV(csv);
    const json = rowsToObjects(rows);
    return J({ ok:true, rows: json });
  } catch (err) {
    return J({ ok:false, error: err.message }, 500);
  }
};

/* CSV helpers (quoted fields supported) */
function parseCSV(text){
  const rows=[]; let i=0, f='', row=[], q=false;
  while(i<text.length){
    const c=text[i];
    if(q){ if(c==='"' && text[i+1]==='"'){f+='"'; i+=2; continue;}
          if(c==='\"'){q=false; i++; continue;}
          f+=c; i++; continue; }
    if(c==='\"'){q=true; i++; continue;}
    if(c===','){row.push(f); f=''; i++; continue;}
    if(c==='\n'){row.push(f); rows.push(row); row=[]; f=''; i++; continue;}
    if(c==='\r'){i++; continue;}
    f+=c; i++;
  }
  row.push(f); rows.push(row);
  return rows.filter(r=>r.some(cell=>String(cell).trim()!==''));
}
function rowsToObjects(rows){
  if(!rows.length) return [];
  const headers=rows[0].map(h=>(h||'').trim());
  return rows.slice(1).map(r=>Object.fromEntries(headers.map((h,idx)=>[h, r[idx]??''])));
}
function J(obj,code=200){return{statusCode:code,headers:{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*'},body:JSON.stringify(obj)}}
