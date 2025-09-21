// netlify/functions/set-inventory.js
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Use POST' };
  }

  // Read CSV text from the request body
  const csv =
    event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;

  if (!csv || !csv.trim()) {
    return { statusCode: 400, body: 'No CSV found in request body' };
  }

  try {
    // Use the **server** Blobs API (works inside Netlify Functions)
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('inventory');

    await store.set('inventory.csv', csv, {
      contentType: 'text/csv; charset=utf-8',
      metadata: { uploadedAt: new Date().toISOString() },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, bytes: csv.length }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: `Error saving CSV: ${err.message}`,
    };
  }
};
