// netlify/functions/list-inventory.js
// Lists the keys present in the "inventory" Blobs store.

import { getStore } from "@netlify/blobs";

const json = (status, payload) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(payload, null, 2),
});

export async function handler() {
  try {
    const opts =
      process.env.BLOBS_SITE_ID && process.env.BLOBS_TOKEN
        ? { siteID: process.env.BLOBS_SITE_ID, token: process.env.BLOBS_TOKEN }
        : undefined;

    const store = getStore("inventory", opts);
    const list = await store.list(); // { blobs: [ { key, size, ... } ] }

    return json(200, { ok: true, ...list });
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
}
