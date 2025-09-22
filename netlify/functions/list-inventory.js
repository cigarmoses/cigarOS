// netlify/functions/list-inventory.js
import { getStore } from "@netlify/blobs";

export async function handler() {
  try {
    const store = getStore("inventory");
    const { blobs } = await store.list();
    return {
      statusCode: 200,
      body: JSON.stringify(blobs, null, 2),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
