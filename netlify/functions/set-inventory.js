// netlify/functions/set-inventory.js
import { getStore } from "@netlify/blobs";

// Standard JSON + CORS helper
const json = (status, payload) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type",
  },
  body: JSON.stringify(payload, null, 2),
});

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "Content-Type": "text/plain" }, body: "Use POST" };
  }

  const siteID = process.env.BLOBS_SITE_ID;
  const token  = process.env.BLOBS_TOKEN;

  if (!siteID || !token) {
    return json(500, {
      ok: false,
      error: "Missing Netlify Blobs credentials in function environment.",
      have: { BLOBS_SITE_ID: !!siteID, BLOBS_TOKEN: !!token }
    });
  }

  try {
    const store = getStore("inventory", { siteID, token });

    const ct = event.headers["content-type"] || event.headers["Content-Type"] || "";
    let csv = "";

    if (ct.startsWith("text/csv")) {
      csv = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : (event.body || "");
    } else if (ct.startsWith("multipart/form-data")) {
      const boundary = /boundary=([^;]+)/i.exec(ct)?.[1];
      if (!boundary) return json(400, { ok:false, error:"Multipart boundary not found" });

      const body = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("binary")
                                         : Buffer.from(event.body || "", "utf8").toString("binary");

      const parts = body.split(`--${boundary}`);
      for (const p of parts) {
        const i = p.indexOf("\r\n\r\n");
        if (i === -1) continue;
        const head = p.slice(0, i);
        if (/name="file"/i.test(head)) {
          csv = Buffer.from(p.slice(i + 4).replace(/\r\n--$/, ""), "binary").toString("utf8");
          break;
        }
      }
      if (!csv) return json(400, { ok:false, error:"CSV not found in multipart 'file' field" });
    } else {
      return json(400, {
        ok:false,
        error:"Unsupported Content-Type. Send text/csv or multipart/form-data with 'file'.",
        got: ct
      });
    }

    if (!csv.trim()) return json(400, { ok:false, error:"Empty CSV" });

    await store.set("inventory.csv", csv, { contentType: "text/csv; charset=utf-8" });

    return json(200, { ok:true, saved:"inventory.csv", bytes: Buffer.byteLength(csv) });
  } catch (err) {
    return json(500, { ok:false, error: String(err && err.message || err) });
  }
}
