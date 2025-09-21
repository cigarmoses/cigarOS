// /netlify/functions/get-inventory.js
const { blobs } = require('@netlify/blobs');

exports.handler = async () => {
  try {
    const store = blobs({ name: 'inventory' });
    const csv = await store.get('inventory.csv');
    if (!csv) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ ok: false, error: 'NOT_FOUND' }),
      };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
      body: csv,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: String(err && err.message || err) }),
    };
  }
};
