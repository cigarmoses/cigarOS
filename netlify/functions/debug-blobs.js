import { getStore } from "@netlify/blobs";
export async function handler() {
  const hasID = !!process.env.BLOBS_SITE_ID;
  const hasTok = !!process.env.BLOBS_TOKEN;
  let canOpen = false;
  try {
    if (hasID && hasTok) {
      const s = getStore("inventory", { siteID: process.env.BLOBS_SITE_ID, token: process.env.BLOBS_TOKEN });
      await s.has("inventory.csv");
      canOpen = true;
    }
  } catch {}
  return {
    statusCode: 200,
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ ok: hasID && hasTok, hasID, hasTok, canOpen }, null, 2)
  };
}
