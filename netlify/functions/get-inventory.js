// netlify/functions/get-inventory.js
exports.handler = async () => {
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('inventory');
    const res = await store.get('inventory.csv');

    if (!res) {
      return { statusCode: 404, body: 'No inventory.csv saved yet' };
    }

    const csv = await res.text();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/csv; charset=utf-8' },
      body: csv,
    };
  } catch (err) {
    return { statusCode: 500, body: `Error: ${err.message}` };
  }
};
