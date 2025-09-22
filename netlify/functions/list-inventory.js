// netlify/functions/list-inventory.js
import { getStore } from "@netlify/blobs";

export async function handler() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token  = process.env.BLOBS_TOKEN;

  if (!siteID || !token) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        ok:false,
        error:"Missing Netlify Blobs credentials in function environment.",
        have:{ BLOBS_SITE_ID: !!siteID, BLOBS_TOKEN: !!token }
      }, null, 2),
    };
  }

  try {
    const store = getStore("inventory", { siteID, token });
    const keys = await store.list();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok:true, keys }, null, 2),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok:false, error:String(err && err.message || err) }, null, 2),
    };
  }
}
