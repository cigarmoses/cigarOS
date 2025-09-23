import { getStore } from "@netlify/blobs";

export async function handler() {
  try {
    const store = getStore("inventory_v3", {
      siteID: process.env.BLOBS_SITE_ID,
      token: process.env.BLOBS_TOKEN
    });

    const csv = await store.get("inventory.csv");
    if (!csv) {
      return {
        statusCode: 200,
        headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" },
        body: JSON.stringify({ ok:true, exists:false })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type":"text/csv; charset=utf-8", "Access-Control-Allow-Origin":"*" },
      body: csv
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" },
      body: JSON.stringify({ ok:false, error: e?.message || "List failed" })
    };
  }
}
