// Lists the latest saved inventory CSV and returns a short JSON preview.
// Uses the same Blobs config pattern as set-inventory.js.

import { getStore } from "@netlify/blobs";

const json = (status, data) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
  },
  body: JSON.stringify(data, null, 2),
});

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "GET") return json(405, { ok: false, error: "Use GET" });

  try {
    const opts =
      process.env.BLOBS_SITE_ID && process.env.BLOBS_TOKEN
        ? { siteID: process.env.BLOBS_SITE_ID, token: process.env.BLOBS_TOKEN }
        : undefined;

    const store = getStore("inventory", opts);

    // We always write to this fixed key in set-inventory.js
    const key = "inventory.csv";

    // If you ever want to confirm presence without downloading:
    // const { keys } = await store.list();
    // const exists = keys?.some(k => k.key === key);

    const csv = await store.get(key, { type: "text" });
    if (!csv) {
      return json(404, { ok: false, error: "No inventory.csv found in Blobs store." });
    }

    // Build a small preview (first 15 rows)
    const lines = csv.split(/\r?\n/);
    const preview = lines.slice(0, 15);

    return json(200, {
      ok: true,
      key,
      bytes: Buffer.byteLength(csv, "utf8"),
      rows: lines.length,
      previewRows: preview.length,
      preview, // first 15 lines
    });
  } catch (err) {
    return json(500, { ok: false, error: err?.message || "Unknown error" });
  }
}
