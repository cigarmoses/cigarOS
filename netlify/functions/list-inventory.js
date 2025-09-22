// netlify/functions/list-inventory.js
import { getStore } from "@netlify/blobs";

const resp = (status, payload) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(payload, null, 2),
});

export async function handler() {
  try {
    // Use the same siteID/token fallback as set-inventory.js
    const opts =
      process.env.BLOBS_SITE_ID && process.env.BLOBS_TOKEN
        ? { siteID: process.env.BLOBS_SITE_ID, token: process.env.BLOBS_TOKEN }
        : undefined;

    const store = getStore("inventory", opts);

    // We always save it as "inventory.csv"
    const key = "inventory.csv";
    const exists = await store.has(key);

    if (!exists) {
      return resp(200, { ok: true, exists: false, note: "No inventory.csv saved yet." });
    }

    const csv = await store.get(key, { type: "text" });
    const lines = (csv || "").split(/\r?\n/);

    return resp(200, {
      ok: true,
      exists: true,
      key,
      size: Buffer.byteLength(csv || "", "utf8"),
      preview: lines.slice(0, 20), // first 20 lines to keep response small
    });
  } catch (err) {
    return resp(500, {
      ok: false,
      error:
        err?.message ||
        "The environment has not been configured to use Netlify Blobs. Ensure BLOBS_SITE_ID and BLOBS_TOKEN are set and re-deploy.",
    });
  }
}
