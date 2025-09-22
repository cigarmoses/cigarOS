// netlify/functions/set-inventory.js
// Saves an uploaded CSV to the Netlify Blobs "inventory" store.
// Accepts either raw text/csv (recommended) or multipart/form-data "file" field.

import { getStore } from "@netlify/blobs";

// Small helper to always return CORS + JSON
const resp = (status, payload) => ({
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
  if (event.httpMethod === "OPTIONS") {
    return resp(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "text/plain" },
      body: "Use POST",
    };
  }

  try {
    // Use explicit siteID/token if provided (your screenshot shows you added them)
    const opts =
      process.env.BLOBS_SITE_ID && process.env.BLOBS_TOKEN
        ? { siteID: process.env.BLOBS_SITE_ID, token: process.env.BLOBS_TOKEN }
        : undefined;

    const store = getStore("inventory", opts);

    // ---- Read CSV from request ----
    const ct = event.headers["content-type"] || event.headers["Content-Type"] || "";

    let csvText = "";

    if (ct.startsWith("text/csv")) {
      // Uploader posts the CSV text body with Content-Type: text/csv
      csvText = event.body || "";
      if (event.isBase64Encoded) {
        csvText = Buffer.from(csvText, "base64").toString("utf8");
      }
    } else if (ct.startsWith("multipart/form-data")) {
      // Very light multipart parser for single 'file' field (CSV)
      // Works for small files; for huge files use a streaming parser (busboy)
      const boundary = /boundary=([^;]+)/i.exec(ct)?.[1];
      if (!boundary) {
        return resp(400, { ok: false, error: "Multipart boundary not found." });
      }
      const bodyBuf = event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : Buffer.from(event.body || "", "utf8");

      const parts = bodyBuf.toString("binary").split(`--${boundary}`);
      // Find the part named "file"
      for (const p of parts) {
        const headerEnd = p.indexOf("\r\n\r\n");
        if (headerEnd === -1) continue;
        const header = p.slice(0, headerEnd);
        if (/name="file"/i.test(header)) {
          const raw = p.slice(headerEnd + 4).replace(/\r\n--$/, "");
          csvText = Buffer.from(raw, "binary").toString("utf8");
          break;
        }
      }
      if (!csvText) {
        return resp(400, { ok: false, error: "CSV not found in multipart 'file' field." });
      }
    } else {
      return resp(400, {
        ok: false,
        error:
          "Unsupported Content-Type. Send text/csv body or multipart/form-data with a 'file' field.",
        got: ct,
      });
    }

    if (!csvText.trim()) {
      return resp(400, { ok: false, error: "Empty CSV." });
    }

    // ---- Save to Blobs ----
    // Use a stable key so POS can always fetch the latest easily.
    // You can also add a versioned key if you like.
    await store.set("inventory.csv", csvText, {
      contentType: "text/csv; charset=utf-8",
    });

    return resp(200, { ok: true, saved: "inventory.csv", bytes: Buffer.byteLength(csvText) });
  } catch (err) {
    const message =
      err?.message ||
      "The environment has not been configured to use Netlify Blobs. If you see this, ensure BLOBS_SITE_ID and BLOBS_TOKEN are set, then redeploy.";
    return resp(500, { ok: false, error: message });
  }
}
