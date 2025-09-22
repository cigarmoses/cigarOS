// netlify/functions/get-inventory.js
import { getStore } from "@netlify/blobs";

const json = (status, payload, extra={}) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    ...extra,
  },
  body: JSON.stringify(payload, null, 2),
});

export async function handler() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token  = process.env.BLOBS_TOKEN;
  if (!siteID || !token) {
    return json(500, {
      ok:false,
      error:"Missing Netlify Blobs credentials in function environment.",
      have:{ BLOBS_SITE_ID: !!siteID, BLOBS_TOKEN: !!token }
    });
  }

  try {
    const store = getStore("inventory", { siteID, token });
    const res = await store.get("inventory.csv");
    const csv = await res?.text?.();
    if (!csv) return json(404, { ok:false, error:"inventory.csv not found" });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
      body: csv,
    };
  } catch (err) {
    return json(500, { ok:false, error:String(err && err.message || err) });
  }
}
