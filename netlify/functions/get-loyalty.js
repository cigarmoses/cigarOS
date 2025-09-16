// netlify/functions/get-loyalty.js
import { getStore } from '@netlify/blobs';

/* helpers */
const truthy = v => {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === 'y' || s === 'yes' || s === 'true' || s === '1' || s === 'x' || s === '✓';
};
function sanitizeJsonText(text){
  return text.replace(/:\s*NaN\b/g, ': null').replace(/:\s*Infinity\b/g, ': null').replace(/:\s*-Infinity\b/g, ': null');
}
function parseCSV(text){
  const rows=[];let i=0,f='',r=[],q=false;const pf=()=>{r.push(f);f='';},pr=()=>{rows.push(r);r=[];};
  while(i<text.length){const c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){f+='"';i+=2;continue;}q=false;i++;continue;}f+=c;i++;continue;}
    if(c==='"'){q=true;i++;continue;} if(c===','){pf();i++;continue;} if(c==='\r'){i++;continue;}
    if(c==='\n'){pf();pr();i++;continue;} f+=c;i++;
  } pf(); if(r.length) pr(); if(!rows.length) return [];
  const h = rows[0].map(s=>(s||'').trim());
  return rows.slice(1).map(row=>{const o={};h.forEach((k,idx)=>o[k]=row[idx]??'');return o;});
}
const pick = (o,keys)=>{for(const k of keys){if(k in o && String(o[k]).trim()!=='') return o[k];}return '';};
function findHeader(o, token){
  const t=token.toLowerCase(); const ks=Object.keys(o);
  const exact=ks.find(k=>k.toLowerCase()===t||k.toLowerCase().includes(`${t} name`)); if(exact) return exact;
  return ks.find(k=>k.toLowerCase().includes(t)) || '';
}
function splitName(s){
  s=String(s||'').trim(); if(!s) return {first:'',last:''};
  if(s.includes(',')){const [last,rest]=s.split(',').map(x=>x.trim()); return {first:rest||'',last:last||''};}
  const p=s.split(/\s+/); if(p.length>=2) return {first:p.slice(0,-1).join(' '),last:p.slice(-1)[0]}; return {first:'',last:s};
}
function normalizeRecord(raw){
  let last  = pick(raw,['Last Name','last_name','Last','LName']);
  let first = pick(raw,['First Name','first_name','First','FName']);
  const nameField = pick(raw,['Name','Full Name','Customer','Client']);
  if(!last){const k=findHeader(raw,'last'); if(k) last=raw[k];}
  if(!first){const k=findHeader(raw,'first'); if(k) first=raw[k];}
  if((!first||!last) && nameField){ const sp=splitName(nameField); if(!first) first=sp.first; if(!last) last=sp.last; }

  const aka    = pick(raw,['Nickname “aka”','Nickname "aka"','aka','AKA','Nick','Nickname']);
  const points = Number(pick(raw,['Points','Rewards','Pts','points','rewards']))||0;
  const lastPurchase = pick(raw,['Last Purchase','Last purchase','Last Visit','Last visit','Last','last_purchase','last visit']);
  const locker = pick(raw,['Locker #','Locker','Locker Number','Locker#','locker_#']).toString().trim();
  const regular = pick(raw,['Regular','regular']);

  const military   = truthy(pick(raw,['Military','military','Vet','Veteran']));
  const responder  = truthy(pick(raw,['First Responder','Responder','first_responder']));
  const lockerFlag = truthy(locker) || truthy(pick(raw,['Locker Member','locker_member']));

  const email = pick(raw,['Email','email','E-mail']);
  const phone = pick(raw,['Phone','phone','Mobile','Cell']);

  return {
    first: String(first||'').trim(),
    last:  String(last||'').trim(),
    aka:   String(aka||'').trim(),
    points,
    lastPurchase: String(lastPurchase||'').trim(),
    locker,
    regular: String(regular||'').trim(),
    email: String(email||'').trim(),
    phone: String(phone||'').trim(),
    badges: { military, responder, locker: lockerFlag },
    _raw: raw
  };
}
async function loadFromBlobs(){
  const store = getStore('contacts');
  const jsonText = await store.get('contacts.json',{type:'text'});
  if(jsonText){
    const arr = JSON.parse(sanitizeJsonText(jsonText));
    if(Array.isArray(arr)) return {source:'blobs-json',data:arr.map(normalizeRecord)};
  }
  const csvText = await store.get('contacts.csv',{type:'text'});
  if(csvText){
    const arr = parseCSV(csvText);
    return {source:'blobs-csv',data:arr.map(normalizeRecord)};
  }
  return {source:'none',data:[]};
}
export default async () => {
  try{
    let { source, data } = await loadFromBlobs();
    if(!data.length){
      try{
        const url = new URL('../../img/contacts.json', import.meta.url);
        const res = await fetch(url);
        const arr = await res.json();
        data = (Array.isArray(arr) ? arr : []).map(normalizeRecord);
        source = 'fallback';
      }catch{}
    }
    if(!data.length) throw new Error('No contacts found');
    return new Response(JSON.stringify({ ok:true, source, data }), { headers:{'content-type':'application/json'} });
  }catch(err){
    return new Response(JSON.stringify({ ok:false, error: err?.message || 'Unable to load contacts' }), {
      status:500, headers:{'content-type':'application/json'}
    });
  }
};
