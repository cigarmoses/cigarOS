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
        body: JSON.stringify({ ok:true, rows:[] })
      };
    }

    const [head, ...lines] = csv.trim().split(/\r?\n/);
    const headers = head.split(",");
    const rows = lines.map(l => {
      const cells = l.split(",");
      const o = {};
      headers.forEach((h,i)=> o[h] = cells[i] ?? "");
      return o;
    });

    return {
      statusCode: 200,
      headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" },
      body: JSON.stringify({ ok:true, rows })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" },
      body: JSON.stringify({ ok:false, error: e?.message || "Get failed" })
    };
  }
}
