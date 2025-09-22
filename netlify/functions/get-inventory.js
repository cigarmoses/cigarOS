// netlify/functions/get-inventory.js
// Returns the latest CSV at the stable key "inventory.csv"

import { getStore } from "@netlify/blobs";

export async function handler() {
  try {
    const opts =
      process.env.BLOBS_SITE_ID && process.env.BLOBS_TOKEN
        ? { siteID: process.env.BLOBS_SITE_ID, token: process.env.BLOBS_TOKEN }
        : undefined;

    const store = getStore("inventory", opts);
    const blob = await store.get("inventory.csv");

    if (!blob) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" },
        body: "No inventory.csv found in Blobs store.",
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
      body: blob.body,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
}
