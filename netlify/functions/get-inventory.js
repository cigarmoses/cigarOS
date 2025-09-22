// netlify/functions/get-inventory.js
import { getStore } from "@netlify/blobs";

export async function handler() {
  try {
    const opts =
      process.env.BLOBS_SITE_ID && process.env.BLOBS_TOKEN
        ? { siteID: process.env.BLOBS_SITE_ID, token: process.env.BLOBS_TOKEN }
        : undefined;

    const store = getStore("inventory", opts);
    const key = "inventory.csv";

    const exists = await store.has(key);
    if (!exists) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" },
        body: "inventory.csv not found",
      };
    }

    const csv = await store.get(key, { type: "text" });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
      body: csv || "",
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" },
      body:
        err?.message ||
        "The environment has not been configured to use Netlify Blobs. Ensure BLOBS_SITE_ID and BLOBS_TOKEN are set.",
    };
  }
}
