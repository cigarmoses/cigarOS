import { getStore } from "@netlify/blobs";

const json = (status, body) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type"
  },
  body: JSON.stringify(body, null, 2)
});

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "Content-Type":"text/plain" }, body: "Use POST" };
  }

  try {
    const store = getStore("inventory_v3", {
      siteID: process.env.BLOBS_SITE_ID,
      token: process.env.BLOBS_TOKEN
    });

    let csv = event.body || "";
    if (event.isBase64Encoded) csv = Buffer.from(csv, "base64").toString("utf8");
    if (!csv.trim()) return json(400, { ok:false, error:"Empty CSV." });

    await store.set("inventory.csv", csv, { contentType: "text/csv; charset=utf-8" });
    return json(200, { ok:true, saved:"inventory.csv", bytes: Buffer.byteLength(csv) });
  } catch (e) {
    return json(500, { ok:false, error: e?.message || "Save failed" });
  }
}
