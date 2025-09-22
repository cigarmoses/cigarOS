// Returns the full inventory CSV with text/csv content-type.

import { getStore } from "@netlify/blobs";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: { ...cors }, body: "" };
  }
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: { ...cors }, body: "Use GET" };
  }

  try {
    const opts =
      process.env.BLOBS_SITE_ID && process.env.BLOBS_TOKEN
        ? { siteID: process.env.BLOBS_SITE_ID, token: process.env.BLOBS_TOKEN }
        : undefined;

    const store = getStore("inventory", opts);
    const key = "inventory.csv";

    const csv = await store.get(key, { type: "text" });
    if (!csv) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8", ...cors },
        body: "inventory.csv not found.",
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/csv; charset=utf-8", ...cors },
      body: csv,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8", ...cors },
      body: (err && err.message) || "Unknown error",
    };
  }
}
